import type { OpenCodeEvent } from "@opencode/client/promise"
import { describe, expect, test } from "bun:test"
import { applyCodexFilesystemChange, connectCodexActivity, createCodexActivityState, reduceCodexActivity } from "./codex-activity"

const event = (value: Record<string, unknown>) => value as OpenCodeEvent

describe("Codex activity projection", () => {
  test("keeps execution and tool state inside one session", () => {
    let state = createCodexActivityState("session-a")
    state = reduceCodexActivity(state, event({ id: "1", type: "session.execution.started", data: { sessionID: "session-a" } }))
    state = reduceCodexActivity(state, event({ id: "2", type: "session.tool.input.started", data: { sessionID: "session-a", assistantMessageID: "message-a", id: "tool-a", name: "bash" } }))
    state = reduceCodexActivity(state, event({ id: "3", type: "session.tool.success", data: { sessionID: "session-a", assistantMessageID: "message-a", id: "tool-a", content: [{ type: "text", text: "ok" }] } }))
    state = reduceCodexActivity(state, event({ id: "4", type: "session.execution.succeeded", data: { sessionID: "session-a" } }))

    expect(state.run).toBe("succeeded")
    expect(state.steps).toEqual([{ id: "tool-a", name: "bash", status: "completed", output: "ok" }])
    expect(reduceCodexActivity(state, event({ id: "5", type: "session.execution.failed", data: { sessionID: "session-b", error: {} } }))).toBe(state)
  })

  test("projects text, approvals, and file changes", () => {
    let state = createCodexActivityState("session-a")
    state = reduceCodexActivity(state, event({ id: "1", type: "session.text.delta", data: { sessionID: "session-a", assistantMessageID: "message-a", ordinal: 0, delta: "hello" } }))
    state = reduceCodexActivity(state, event({ id: "2", type: "permission.asked", data: { id: "permission-a", sessionID: "session-a", action: "tool.execute", resources: ["repo"], message: "Approve" } }))
    state = reduceCodexActivity(state, event({ id: "3", type: "permission.replied", data: { sessionID: "session-a", requestID: "permission-a", reply: "once" } }))
    state = applyCodexFilesystemChange(state, { file: "src/main.ts", event: "change" })

    expect(state.assistantText).toBe("hello")
    expect(state.approvals[0]).toMatchObject({ id: "permission-a", status: "replied", reply: "once" })
    expect(state.changedFiles).toEqual(["src/main.ts"])
  })

  test("connects the projection to the live event stream contract", () => {
    let listener: ((event: OpenCodeEvent) => void) | undefined
    const states = [] as ReturnType<typeof createCodexActivityState>[]
    const dispose = connectCodexActivity({
      sessionID: "session-a",
      directory: "E:/CodeAI",
      event: { listen(handler) { listener = handler; return () => { listener = undefined } } },
      onState(state) { states.push(state) },
    })

    listener?.(event({ id: "1", type: "session.execution.started", data: { sessionID: "session-a" } }))
    listener?.(event({ id: "2", type: "filesystem.changed", location: { directory: "E:/CodeAI" }, data: { file: "src/main.ts", event: "change" } }))

    expect(states.at(-1)).toMatchObject({ run: "running", changedFiles: ["src/main.ts"] })
    dispose()
    expect(listener).toBeUndefined()
  })
})
