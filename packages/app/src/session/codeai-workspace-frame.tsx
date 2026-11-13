import { For, createMemo, type ParentProps } from "solid-js"
import { useParams } from "@solidjs/router"
import type { SessionModel } from "./model"
import { useData, useServer } from "@/runtime/server/current"
import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"

export function CodeAIWorkspaceFrame(props: ParentProps<{ session: SessionModel }>) {
  const platform = usePlatform()
  const params = useParams<{ id: string }>()
  const data = useData()
  const server = useServer()
  const language = useLanguage()
  const current = createMemo(() => data.session.get(params.id))
  const project = createMemo(() => {
    const session = current()
    return session ? server.ctx.projects.forSession(session) : undefined
  })
  const worktree = createMemo(() => {
    const session = current()
    const value = project()
    if (!session || !value) return undefined
    return value.worktrees.find((item) => item.directory === session.location.directory)
  })
  const sessions = createMemo(() => {
    const session = current()
    const value = project()
    if (!session || !value) return []
    return data.session
      .list()
      .filter((item) => item.projectID === session.projectID && item.time.archived === undefined)
      .toSorted((a, b) => b.time.updated - a.time.updated)
      .slice(0, 12)
  })

  if (platform.platform !== "desktop") return <>{props.children}</>

  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden" data-component="codeai-workspace-frame">
      <aside class="hidden w-[232px] shrink-0 flex-col border-e border-v2-border-border-base bg-v2-background-bg-base lg:flex">
        <div class="flex h-12 shrink-0 items-center border-b border-v2-border-border-base px-4 text-14-medium text-v2-text-text-base">
          CodeAI
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <div class="mb-2 px-2 text-11-medium uppercase tracking-[0.08em] text-v2-text-text-muted">
            {language.t("command.category.project")}
          </div>
          <div class="rounded-md bg-v2-background-bg-elevated px-2.5 py-2 text-13-medium text-v2-text-text-base">
            {project()?.name ?? "—"}
          </div>
          <div class="mt-1 truncate px-2.5 py-1 text-12-regular text-v2-text-text-muted">
            {worktree()?.directory ?? current()?.location.directory ?? "—"}
          </div>
          <div class="mb-2 mt-5 px-2 text-11-medium uppercase tracking-[0.08em] text-v2-text-text-muted">
            {language.t("command.category.workspace")}
          </div>
          <div class="rounded-md px-2.5 py-2 text-13-regular text-v2-text-text-base">
            {worktree()?.directory.split(/[\\/]/).filter(Boolean).at(-1) ?? "—"}
          </div>
          <div class="mb-2 mt-5 px-2 text-11-medium uppercase tracking-[0.08em] text-v2-text-text-muted">
            {language.t("command.category.session")}
          </div>
          <div class="flex flex-col gap-0.5">
            <For each={sessions()}>
              {(item) => (
                <div
                  class="truncate rounded-md px-2.5 py-2 text-13-regular"
                  classList={{
                    "bg-v2-background-bg-elevated text-v2-text-text-base": item.id === current()?.id,
                    "text-v2-text-text-muted": item.id !== current()?.id,
                  }}
                >
                  {item.title || language.t("command.session.new")}
                </div>
              )}
            </For>
          </div>
        </div>
      </aside>
      <main class="flex min-h-0 min-w-0 flex-1 flex-col">{props.children}</main>
    </div>
  )
}
