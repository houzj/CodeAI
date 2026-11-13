import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import type { SessionMessageAssistant } from "@opencode/client/promise"
import { useLanguage } from "@/runtime/i18n/language"
import { useServerSDK } from "@/runtime/server/client"
import { connectCodexActivity, projectCodexActivityFromHistory, type CodexActivityState } from "./codex-activity"
import type { SessionModel } from "./model"

export function CodeAIRunCenter(props: { session: SessionModel }) {
  const language = useLanguage()
  const sdk = useServerSDK()
  const [activity, setActivity] = createSignal<CodexActivityState>()
  const identity = createMemo(() => {
    const info = props.session.data.info()
    return info ? { id: info.id, directory: info.location.directory } : undefined
  })
  const task = createMemo(() => props.session.history.lastUserMessage()?.text ?? language.t("session.run.emptyTask"))
  const assistant = createMemo(() => props.session.history.messages().findLast((message) => message.type === "assistant"))
  const result = createMemo(() => assistantText(assistant()))
  const status = createMemo(() => {
    const current = activity()
    if (current?.run === "running" || props.session.data.working()) return language.t("session.child.status.running")
    if (current?.run === "failed") return language.t("session.child.status.failed")
    if (current?.run === "interrupted") return language.t("session.child.status.interrupted")
    if (current?.run === "succeeded") return language.t("session.child.status.succeeded")
    return language.t("session.runtime.idle")
  })
  const pending = () => activity()?.approvals.filter((item) => item.status === "pending") ?? []
  const permissions = createMemo(() => {
    const id = identity()?.id
    return id ? props.session.shared.data.session.permission.list(id) ?? [] : []
  })
  const approve = (requestID: string) => {
    const id = identity()?.id
    if (!id) return
    void props.session.shared.data.session.permission.reply({ sessionID: id, requestID, decision: "once" })
  }

  createEffect(() => {
    const current = identity()
    if (!current) return
    setActivity(projectCodexActivityFromHistory(current.id, props.session.history.messages()))
    const disconnect = connectCodexActivity({
      sessionID: current.id,
      directory: current.directory,
      event: sdk.event,
      onState: setActivity,
    })
    onCleanup(disconnect)
  })

  return (
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-6 md:px-8" data-component="codeai-run-center">
      <div class="mx-auto flex w-full max-w-[760px] flex-col gap-6">
        <section class="border-s-2 border-v2-border-border-focus px-4 py-1">
          <div class="mb-2 flex items-center justify-between gap-3 text-11-medium uppercase tracking-[0.08em] text-v2-text-text-muted">
            <span>{language.t("session.run.task")}</span>
            <span class="normal-case tracking-normal text-v2-text-text-faint" aria-live="polite">{status()}</span>
          </div>
          <p class="whitespace-pre-wrap text-14-regular leading-6 text-v2-text-text-base">{task()}</p>
        </section>
        <Show when={result()}>
          {(value) => (
            <section class="px-4">
              <div class="mb-2 text-11-medium uppercase tracking-[0.08em] text-v2-text-text-muted">{language.t("session.run.result")}</div>
              <p class="whitespace-pre-wrap text-13-regular leading-6 text-v2-text-text-base">{value()}</p>
            </section>
          )}
        </Show>
        <details class="border-t border-v2-border-border-base">
          <summary class="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-13-medium text-v2-text-text-muted hover:text-v2-text-text-base">
            <span>{language.t("session.run.runtime")}</span>
            <span class="text-v2-text-text-faint">{language.t("session.runtime.steps", { count: activity()?.steps.length ?? 0 })}</span>
            <Show when={pending().length > 0}>
              <span class="text-v2-text-warning">{language.t("session.runtime.approvals", { count: pending().length })}</span>
            </Show>
            <span class="ms-auto text-v2-text-text-faint">⌄</span>
          </summary>
          <div class="flex flex-col gap-2 px-4 pb-3">
            <Show when={(activity()?.steps.length ?? 0) > 0} fallback={<div class="text-12-regular text-v2-text-text-faint">{language.t("session.runtime.empty")}</div>}>
              <For each={activity()?.steps ?? []}>
                {(step) => (
                  <div class="flex items-center gap-2 text-12-regular text-v2-text-text-muted">
                    <span class="text-v2-text-success">{step.status === "completed" ? "✓" : "·"}</span>
                    <span class="min-w-0 flex-1 truncate">{step.name ?? step.id}</span>
                    <span class="text-v2-text-text-faint">{step.status}</span>
                  </div>
                )}
              </For>
            </Show>
            <Show when={pending().length > 0}>
              <div class="border-t border-v2-border-border-base pt-2 text-12-regular text-v2-text-warning">
                <For each={pending()}>{(item) => <div class="truncate">{item.action} · {item.resources.join(", ")}</div>}</For>
              </div>
            </Show>
            <Show when={permissions().length > 0}>
              <div class="border-t border-v2-border-border-base pt-2">
                <For each={permissions()}>
                  {(request) => (
                    <div class="flex items-center gap-3 py-1.5 text-12-regular">
                      <span class="min-w-0 flex-1 truncate text-v2-text-warning">{request.action}</span>
                      <button
                        type="button"
                        class="rounded border border-v2-border-border-base px-2 py-1 text-12-medium text-v2-text-text-base hover:bg-v2-background-bg-layer-02"
                        onClick={() => approve(request.id)}
                      >
                        {language.t("session.run.approveOnce")}
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </Show>
            <Show when={(activity()?.changedFiles.length ?? 0) > 0}>
              <div class="border-t border-v2-border-border-base pt-2 text-12-regular text-v2-text-text-muted">
                <div>{language.t("session.runtime.changes", { count: activity()?.changedFiles.length ?? 0 })}</div>
                <For each={activity()?.changedFiles ?? []}>
                  {(file) => <div class="truncate text-v2-text-text-faint">{file}</div>}
                </For>
              </div>
            </Show>
          </div>
        </details>
      </div>
    </div>
  )
}

function assistantText(message: SessionMessageAssistant | undefined) {
  return message?.content
    .filter((part): part is Extract<SessionMessageAssistant["content"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim()
}
