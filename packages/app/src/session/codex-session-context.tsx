import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
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
  const sessionIdentity = createMemo(() => {
    const session = props.session()
    return session ? { id: session.id, directory: session.location.directory } : undefined
  })
  const snapshot = createMemo(() => {
    const session = props.session()
    return session ? selectCodexSessionSnapshot({ session, project: server.ctx.projects.forSession(session) }) : undefined
  })

  createEffect(() => {
    const identity = sessionIdentity()
    if (!identity) return

    setActivity(createCodexActivityState(identity.id))
    const disconnect = connectCodexActivity({
      sessionID: identity.id,
      directory: identity.directory,
      event: sdk.event,
      onState: setActivity,
    })
    onCleanup(disconnect)
  })

  onCleanup(() => setActivity(undefined))

  return (
    <Show when={snapshot()} keyed>
      {(value) => (
        <div class="flex shrink-0 flex-col border-b border-v2-border-border-base" data-slot="codex-session-context">
          <div class="flex items-center justify-between gap-3 px-3 py-2">
            <div class="min-w-0">
              <div class="truncate text-13-medium text-v2-text-primary">
              {value.project.name} <span class="text-v2-text-tertiary">/</span> {value.worktree.name} <span class="text-v2-text-tertiary">/</span> {value.session.title}
              </div>
              <div class="truncate text-12-regular text-v2-text-tertiary">{value.worktree.directory}</div>
            </div>
          </div>
          <Show when={activity()}>{(current) => <ActivityDetails activity={current()} />}</Show>
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
    <details class="group border-t border-v2-border-border-base">
      <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-12-regular text-v2-text-text-muted hover:bg-v2-background-base-hover">
        <span classList={{ "text-v2-text-success": props.activity.run === "running", "text-v2-text-warning": pending().length > 0 }}>{props.activity.run === "running" ? "●" : "○"}</span>
        <span>{status(props.activity.run)}</span>
        <span class="text-v2-text-text-muted">{language.t("session.runtime.steps", { count: props.activity.steps.length })}</span>
        <Show when={pending().length > 0}>
          <span class="text-v2-text-warning">{language.t("session.runtime.approvals", { count: pending().length })}</span>
        </Show>
        <span class="ms-auto text-v2-text-tertiary">⌄</span>
      </summary>
      <div class="flex flex-col gap-1 bg-v2-background-bg-base px-3 pb-2 pt-1">
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
        <Show when={props.activity.changedFiles.length > 0}>
          <div class="mt-1 border-t border-v2-border-border-base px-2 pt-2 text-12-regular text-v2-text-text-muted">
            <div>{language.t("session.runtime.changes", { count: props.activity.changedFiles.length })}</div>
            <For each={props.activity.changedFiles}>{(file) => <div class="truncate text-v2-text-text-muted">{file}</div>}</For>
          </div>
        </Show>
      </div>
    </details>
  )
}
