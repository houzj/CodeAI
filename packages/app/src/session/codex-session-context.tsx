import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import type { SessionInfo } from "@opencode/client/promise"
import { useServerSDK } from "@/runtime/server/client"
import { useServer } from "@/runtime/server/current"
import { useLanguage } from "@/runtime/i18n/language"
import { connectCodexActivity, createCodexActivityState, type CodexActivityState } from "./codex-activity"
import { selectCodexSessionSnapshot } from "./codex-session"

export function CodexSessionContext(props: { session: () => SessionInfo | undefined }) {
  const server = useServer()
  const sdk = useServerSDK()
  const [activity, setActivity] = createSignal<CodexActivityState | undefined>()
  const snapshot = createMemo(() => {
    const session = props.session()
    return session ? selectCodexSessionSnapshot({ session, project: server.ctx.projects.forSession(session) }) : undefined
  })

  createEffect(() => {
    const session = props.session()
    if (!session) return

    setActivity(createCodexActivityState(session.id))
    const disconnect = connectCodexActivity({
      sessionID: session.id,
      directory: session.location.directory,
      event: sdk.event,
      onState: setActivity,
    })
    onCleanup(disconnect)
  })

  onCleanup(() => setActivity(undefined))

  return (
    <Show when={snapshot()} keyed>
      {(value) => (
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-v2-border-border-base px-3 py-2" data-slot="codex-session-context">
          <div class="min-w-0">
            <div class="truncate text-13-medium text-v2-text-primary">
              {value.project.name} <span class="text-v2-text-tertiary">/</span> {value.worktree.name} <span class="text-v2-text-tertiary">/</span> {value.session.title}
            </div>
            <div class="truncate text-12-regular text-v2-text-tertiary">{value.worktree.directory}</div>
          </div>
          <div class="flex shrink-0 items-center gap-2 text-12-regular text-v2-text-tertiary">
            <Show when={value.session.model}>
              {(model) => <span class="max-w-44 truncate">{model().providerID} / {model().modelID}</span>}
            </Show>
            <Show when={activity()}>
              {(current) => <ActivityDetails activity={current()} />}
            </Show>
          </div>
        </div>
      )}
    </Show>
  )
}

function ActivityDetails(props: { activity: CodexActivityState }) {
  const language = useLanguage()
  const pending = () => props.activity.approvals.filter((item) => item.status === "pending")
  const status = (value: CodexActivityState["run"]) => {
    if (value === "running") return language.t("session.child.status.running")
    if (value === "succeeded") return language.t("session.child.status.succeeded")
    if (value === "failed") return language.t("session.child.status.failed")
    if (value === "interrupted") return language.t("session.child.status.interrupted")
    return language.t("session.runtime.idle")
  }
  return (
    <details class="group relative">
      <summary class="flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-1 hover:bg-v2-background-base-hover">
        <span classList={{ "text-v2-text-success": props.activity.run === "running", "text-v2-text-warning": pending().length > 0 }}>{props.activity.run === "running" ? "●" : "○"}</span>
        <span>{props.activity.steps.length}</span>
        <span class="text-v2-text-tertiary">⌄</span>
      </summary>
      <div class="absolute end-0 top-8 z-20 w-72 rounded-lg border border-v2-border-border-base bg-v2-background-base p-2 shadow-lg">
        <Show when={props.activity.steps.length > 0} fallback={<div class="px-2 py-1 text-12-regular text-v2-text-tertiary">{language.t("session.runtime.empty")}</div>}>
          <div class="flex flex-col gap-1">
            {props.activity.steps.map((step) => (
              <div class="flex items-center gap-2 rounded px-2 py-1 text-12-regular">
                <span class="text-v2-text-tertiary">{step.status === "completed" ? "✓" : step.status === "failed" ? "!" : "·"}</span>
                <span class="min-w-0 flex-1 truncate">{step.name ?? step.id}</span>
                <span class="text-v2-text-tertiary">{step.status === "completed" ? language.t("session.child.status.succeeded") : step.status === "failed" ? language.t("session.child.status.failed") : status("running")}</span>
              </div>
            ))}
          </div>
        </Show>
        <Show when={pending().length > 0}>
          <div class="mt-1 border-t border-v2-border-border-base px-2 pt-2 text-12-regular text-v2-text-warning">
            {pending().map((item) => <div class="truncate">{item.action} · {item.resources.join(", ")}</div>)}
          </div>
        </Show>
      </div>
    </details>
  )
}
