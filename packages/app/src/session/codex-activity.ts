import type { OpenCodeEvent, PermissionReply, SessionMessageAssistant, SessionMessageInfo } from "@opencode/client/promise"
import type { OpenCodeEventStream } from "@/runtime/server/client"

export type CodexRunStatus = "idle" | "running" | "succeeded" | "failed" | "interrupted"
export type CodexStepStatus = "running" | "completed" | "failed"

export type CodexActivityStep = {
  readonly id: string
  readonly name?: string
  readonly status: CodexStepStatus
  readonly input?: string
  readonly output?: string
  readonly error?: string
}

export type CodexActivityApproval = {
  readonly id: string
  readonly action: string
  readonly resources: readonly string[]
  readonly message?: string
  readonly status: "pending" | "replied"
  readonly reply?: PermissionReply
}

export type CodexActivityState = {
  readonly sessionID: string
  readonly run: CodexRunStatus
  readonly steps: readonly CodexActivityStep[]
  readonly approvals: readonly CodexActivityApproval[]
  readonly assistantText: string
  readonly reasoningText: string
  readonly changedFiles: readonly string[]
  readonly lastEventID?: string
}

export function createCodexActivityState(sessionID: string): CodexActivityState {
  return {
    sessionID,
    run: "idle",
    steps: [],
    approvals: [],
    assistantText: "",
    reasoningText: "",
    changedFiles: [],
  }
}

/** Rebuilds durable Run steps when the live event stream is no longer attached. */
export function projectCodexActivityFromHistory(
  sessionID: string,
  messages: readonly SessionMessageInfo[],
): CodexActivityState {
  const assistants = messages.filter((message): message is SessionMessageAssistant => message.type === "assistant")
  const latest = assistants.at(-1)
  const steps = assistants.flatMap((message) =>
    message.content.flatMap((part) => {
      if (part.type !== "tool") return []

      const state = part.state
      const status: CodexStepStatus = state.status === "completed" ? "completed" : state.status === "error" ? "failed" : "running"
      const output = state.status === "completed" || state.status === "error"
        ? state.content?.filter((item): item is Extract<typeof state.content[number], { type: "text" }> => item.type === "text").map((item) => item.text).join("\n")
        : undefined

      return [{
        id: part.id,
        name: part.name,
        status,
        input: "input" in state ? JSON.stringify(state.input) : undefined,
        output,
        error: state.status === "error" ? state.error.message : undefined,
      }]
    }),
  )

  return {
    ...createCodexActivityState(sessionID),
    run: latest?.error ? "failed" : latest?.time.completed ? "succeeded" : latest ? "running" : "idle",
    steps,
    assistantText: latest ? assistantTextFromMessage(latest) : "",
  }
}

export function reduceCodexActivity(state: CodexActivityState, event: OpenCodeEvent): CodexActivityState {
  const sessionID = sessionIDOf(event)
  if (sessionID !== state.sessionID) return state

  const next = { ...state, lastEventID: event.id }

  if (event.type === "session.execution.started") return { ...next, run: "running" }
  if (event.type === "session.execution.succeeded") return { ...next, run: "succeeded" }
  if (event.type === "session.execution.failed") return { ...next, run: "failed" }
  if (event.type === "session.execution.interrupted") return { ...next, run: "interrupted" }

  if (event.type === "session.text.delta") return { ...next, assistantText: state.assistantText + event.data.delta }
  if (event.type === "session.text.ended") return { ...next, assistantText: event.data.text }
  if (event.type === "session.reasoning.delta") return { ...next, reasoningText: state.reasoningText + event.data.delta }
  if (event.type === "session.reasoning.ended") return { ...next, reasoningText: event.data.text }

  if (event.type === "session.tool.input.started") {
    return updateStep(next, event.data.id, (step) => ({ ...step, id: event.data.id, name: event.data.name, status: "running" }))
  }
  if (event.type === "session.tool.input.delta") {
    return updateStep(next, event.data.id, (step) => ({ ...step, id: event.data.id, status: "running", input: (step.input ?? "") + event.data.delta }))
  }
  if (event.type === "session.tool.input.ended") {
    return updateStep(next, event.data.id, (step) => ({ ...step, id: event.data.id, status: "running", input: event.data.text }))
  }
  if (event.type === "session.tool.called") {
    return updateStep(next, event.data.id, (step) => ({ ...step, id: event.data.id, status: "running", input: JSON.stringify(event.data.input) }))
  }
  if (event.type === "session.tool.success") {
    return updateStep(next, event.data.id, (step) => ({ ...step, id: event.data.id, status: "completed", output: event.data.content.map((item) => item.type === "text" ? item.text : "").join("\n") }))
  }
  if (event.type === "session.tool.failed") {
    return updateStep(next, event.data.id, (step) => ({ ...step, id: event.data.id, status: "failed", error: event.data.error.message }))
  }

  if (event.type === "permission.asked") {
    const approvals = state.approvals.filter((item) => item.id !== event.data.id)
    return {
      ...next,
      approvals: [...approvals, {
        id: event.data.id,
        action: event.data.action,
        resources: event.data.resources,
        message: event.data.message,
        status: "pending",
      }],
    }
  }
  if (event.type === "permission.replied") {
    return {
      ...next,
      approvals: state.approvals.map((item) => item.id === event.data.requestID ? { ...item, status: "replied", reply: event.data.reply } : item),
    }
  }

  return next
}

export function applyCodexFilesystemChange(
  state: CodexActivityState,
  input: { file: string; event: "add" | "change" | "unlink" },
): CodexActivityState {
  const files = new Set(state.changedFiles)
  if (input.event === "unlink") files.delete(input.file)
  else files.add(input.file)
  return { ...state, changedFiles: [...files] }
}

export function connectCodexActivity(input: {
  sessionID: string
  directory?: string
  event: Pick<OpenCodeEventStream, "listen">
  onState: (state: CodexActivityState) => void
}) {
  let state = createCodexActivityState(input.sessionID)

  return input.event.listen((event) => {
    if (event.type === "filesystem.changed") {
      if (input.directory !== undefined && event.location?.directory !== input.directory) return
      state = applyCodexFilesystemChange(state, event.data)
      input.onState(state)
      return
    }

    const next = reduceCodexActivity(state, event)
    if (next === state) return
    state = next
    input.onState(state)
  })
}

function sessionIDOf(event: OpenCodeEvent) {
  if ("sessionID" in event.data) return event.data.sessionID
  return undefined
}

function updateStep(
  state: CodexActivityState,
  id: string,
  update: (step: CodexActivityStep) => CodexActivityStep,
) {
  const existing = state.steps.find((step) => step.id === id)
  const base = existing ?? { id, status: "running" as const }
  const steps = existing ? state.steps.map((step) => step.id === id ? update(step) : step) : [...state.steps, update(base)]
  return { ...state, steps }
}

function assistantTextFromMessage(message: SessionMessageAssistant) {
  return message.content
    .filter((part): part is Extract<SessionMessageAssistant["content"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim()
}
