import { Schema } from "effect"
import { HoverCard } from "@kobalte/core/hover-card"
import { createEffect, createMemo, For, Show, onCleanup, untrack, type JSX } from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { createStore } from "solid-js/store"
import { useQuery } from "@tanstack/solid-query"
import { DragDropProvider, PointerSensor, useDroppable } from "@dnd-kit/solid"
import { isSortable, useSortable } from "@dnd-kit/solid/sortable"
import { Accessibility, Feedback, PointerActivationConstraints } from "@dnd-kit/dom"
import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers"
import { Button } from "@opencode/ui/button"
import { useDialog } from "@opencode/ui/context/dialog"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Menu } from "@opencode/ui/menu"
import { ScrollView } from "@opencode/ui/scroll-view"
import { displayName } from "@opencode/ui/project-avatar"
import { getFilename } from "@opencode/util/path"
import { homeSessionsQuery } from "@/home/sessions/queries"
import { createProjectActions } from "@/home/projects/actions"
import { CreateProjectDialog } from "@/home/projects/create-dialog"
import { ProjectMenuItems } from "@/home/projects/menu"
import { buildHomeSessionRecords, type HomeSessionRecord } from "@/home/sessions/records"
import { arrayMove } from "@/runtime/array-move"
import { useLanguage } from "@/runtime/i18n/language"
import { Persistence } from "@/runtime/persistence/schema"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { ServerConnection, useServers } from "@/runtime/server/registry"
import { useGlobal, useServerCtx } from "@/runtime/server/runtime"
import type { Project } from "@/runtime/server/types"
import { ProjectIcon } from "@/shell/layout/project-icon"
import { showToast } from "@/shell/notifications/toast"
import { errorMessage } from "@/shell/layout/helpers"
import { useLayout } from "@/shell/state/layout"
import { createProjectSessionActions } from "@/shell/tabs/project-sessions"
import { useTabs, type Tab } from "@/shell/tabs/tabs"
import { pathKey } from "@/workspaces/path-key"
import "./tab-nav.css"
import { ProjectSessionRow } from "./project-session-row"
import { isSidebarSessionActivity, mergeSidebarSessions } from "./sidebar-sessions"

const SidebarState = Persistence.struct({
  projectsCollapsed: Schema.Boolean,
  expanded: Persistence.record(Schema.Boolean),
  order: Persistence.record(Schema.mutable(Schema.Array(Schema.String))),
})

/** Tracks session activity on every server, and keeps a preview tab once its session does something. */
export function createSidebarActivityListener() {
  const tabs = useTabs()

  const global = useGlobal()

  // Keep a preview tab once its session shows activity. Ordering comes from the shared data layer, so this listener
  // only decides when a preview has become worth keeping.
  createEffect(() => {
    global.servers.list().forEach((conn) => {
      const server = ServerConnection.key(conn)
      const ctx = global.serverCtx(server)

      if (!ctx) return
      onCleanup(
        ctx.data.listen(({ details }) => {
          if (!isSidebarSessionActivity(details)) return
          const sessionID = details.data.sessionID
          const preview = tabs.preview()

          if (
            preview?.server === server &&
            (preview.sessionId === sessionID || preview.sessionId === ctx.data.session.root(sessionID))
          )
            tabs.keepPreview()
        }),
      )
    })
  })
}

export function SidebarOrganized(props: {
  currentTab: Tab | undefined
}) {
  const language = useLanguage()
  const tabs = useTabs()
  const dialog = useDialog()
  const servers = useServers()
  const layout = useLayout()

  createSidebarActivityListener()

  const [local, setLocal] = createStore<{
    thumbTrack: HTMLDivElement | undefined
    hoverTarget: HTMLDivElement | undefined
  }>({ thumbTrack: undefined, hoverTarget: undefined })

  const [state, setState, , ready] = persisted(Persist.global("sidebar.organize"), SidebarState, {
    projectsCollapsed: false,
    expanded: {},
    order: {},
  })

  const addProject = () => {
    const server =
      servers.visible.find((conn) => ServerConnection.key(conn) === props.currentTab?.server) ??
      servers.visible.find((conn) => ServerConnection.key(conn) === layout.home.selection().server) ??
      servers.visible[0]

    if (!server) return

    dialog.show(() => <CreateProjectDialog server={server} />)
  }

  const isOpenTab = (server: ServerConnection.Key, sessionId: string) =>
    tabs.store.some((tab) => tab.type === "session" && tab.server === server && tab.sessionId === sessionId)

  return (
    <div
      ref={(element) => setLocal("hoverTarget", element)}
      class="relative flex min-h-0 flex-1 flex-col [app-region:no-drag]"
    >
      <div
        ref={(element) => setLocal("thumbTrack", element)}
        class="pointer-events-none absolute inset-y-0 z-10 w-3"
        style={{
          "inset-inline-end": "calc(-1 * (var(--sidebar-inset-end, 3px) + var(--shell-inline-inset, 8px)))",
        }}
      />
      <ScrollView class="min-h-0 flex-1" thumbContainer={local.thumbTrack} thumbHoverTarget={local.hoverTarget}>
        <div class="flex flex-col gap-3">
          <section class="flex shrink-0 flex-col gap-2">
            <div class="group/projects-header flex h-6 w-full shrink-0 items-center rounded-[6px] px-2 hover:bg-v2-overlay-simple-overlay-hover">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-1.5 text-start text-[13px] leading-4 font-medium text-v2-text-text-muted hover:text-v2-text-text-base focus-visible:outline-none"
                aria-expanded={!state.projectsCollapsed}
                onClick={() => setState("projectsCollapsed", (value) => !value)}
              >
                <span class="min-w-0 truncate">{language.t("sidebar.organize.projects")}</span>
                <Icon
                  name="chevron-down"
                  size="small"
                  class="size-3 shrink-0 text-v2-icon-icon-base opacity-0 transition-[opacity,transform] group-hover/projects-header:opacity-100 group-focus-within/projects-header:opacity-100"
                  classList={{
                    "-rotate-90 rtl:rotate-90": state.projectsCollapsed,
                    "opacity-100": state.projectsCollapsed,
                  }}
                />
              </button>
              <div
                class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/projects-header:opacity-100 focus-within:opacity-100"
                classList={{ "opacity-100": state.projectsCollapsed }}
              >
                <IconButton
                  variant="ghost-muted"
                  size="small"
                  icon={<Icon name="outline-sliders" size="small" />}
                  aria-label="项目视图设置"
                  title="项目视图设置"
                  onClick={() => setState("projectsCollapsed", (value) => !value)}
                />
                <IconButton
                  variant="ghost-muted"
                  size="small"
                  icon={<Icon name="plus" size="small" />}
                  aria-label={language.t("home.project.add")}
                  title={language.t("home.project.add")}
                  onClick={addProject}
                />
              </div>
            </div>
            <Show when={!state.projectsCollapsed}>
              <div class="flex min-w-0 flex-col gap-1">
                <ProjectList
                  currentTab={props.currentTab}
                  isOpenTab={isOpenTab}
                  highlightActive
                  state={state}
                  ready={ready()}
                  onExpand={(key) => setState("expanded", key, (value) => !value)}
                  onReorder={(server, ids) => setState("order", server, ids)}
                />
              </div>
            </Show>
          </section>
          {/* Sessions are opened directly from the project tree. The titlebar tab strip is intentionally absent in
              Projects mode so a project owns multiple conversations instead of one conversation per visible tab. */}
        </div>
      </ScrollView>
    </div>
  )
}

function ProjectList(props: {
  currentTab: Tab | undefined
  isOpenTab: (server: ServerConnection.Key, sessionId: string) => boolean
  highlightActive: boolean
  state: typeof SidebarState.Type
  ready: boolean
  onExpand: (key: string) => void
  onReorder: (server: string, ids: string[]) => void
}) {
  const language = useLanguage()

  const servers = useServers()

  const layout = useLayout()

  const actions = createProjectSessionActions()

  const projectActions = createProjectActions()

  const [local, setLocal] = createStore<{ showAll: boolean; recentLimit: number }>({
    showAll: false,
    recentLimit: 5,
  })

  const connection = createMemo(
    () =>
      servers.visible.find(
        (conn) => ServerConnection.key(conn) === (props.currentTab?.server ?? layout.home.selection().server),
      ) ?? servers.visible[0],
  )

  const ctx = useServerCtx(connection)

  const server = () => {
    const conn = connection()

    return conn ? ServerConnection.key(conn) : undefined
  }

  const projects = createMemo(() => {
    const list = ctx()?.projects.list() ?? []

    const order = props.state.order[server() ?? ""] ?? []

    return [
      ...order.flatMap((id) => list.find((project) => project.id === id) ?? []),
      ...list.filter((project) => !order.includes(project.id)),
    ]
  })

  const visible = () => (local.showAll ? projects() : projects().slice(0, 7))

  // Freeze the initial order, then append newly used projects instead of following last activity.
  createEffect(() => {
    const key = server()

    if (!props.ready || !servers.hydrated() || !key || !ctx()?.sync.project.ready()) return
    const ids = projects().map((project) => project.id)

    const saved = props.state.order[key] ?? []

    if (ids.length === saved.length && ids.every((id, index) => id === saved[index])) return
    untrack(() => props.onReorder(key, ids))
  })

  const sessions = useQuery(() => ({
    ...homeSessionsQuery(connection(), ctx()),
    enabled: ctx()?.sdk.connection.status() === "connected",
  }))

  const records = createMemo(() => {
    const current = ctx()

    if (!current) return []

    return buildHomeSessionRecords({
      sessions: () =>
        current.data.session.apply(
          mergeSidebarSessions(sessions.isPending ? [] : (sessions.data?.() ?? []), current.data.session.known()),
        ),
      projects,
      projectDirectories: () => undefined,
      resolveProject: current.projects.forSession,
    })
  })

  const recentSessions = createMemo(() => records().slice(0, local.recentLimit))

  return (
    <>
      <Show when={connection()}>
        {(conn) => (
          <>
            <DragDropProvider
            sensors={[
              PointerSensor.configure({
                activationConstraints: [new PointerActivationConstraints.Distance({ value: 4 })],
                preventActivation: (event) =>
                  event.target instanceof Element && !!event.target.closest("[data-project-action]"),
              }),
            ]}
            modifiers={[RestrictToVerticalAxis]}
            plugins={(defaults) => [
              ...defaults.filter((plugin) => plugin !== Accessibility),
              Feedback.configure({ dropAnimation: null }),
            ]}
            onDragEnd={(event) => {
              const source = event.operation.source
              const target = event.operation.target

              if (
                !event.canceled &&
                source?.data.type === "session" &&
                target?.data.type === "project" &&
                typeof source.data.sessionID === "string" &&
                typeof target.data.directory === "string"
              ) {
                const current = ctx()
                if (!current) return

                void current.sdk.api.session
                  .move({ sessionID: source.data.sessionID, directory: target.data.directory })
                  .then(() => current.data.session.sync(source.data.sessionID))
                  .catch((error) =>
                    showToast({
                      title: language.t("common.requestFailed"),
                      description: errorMessage(error, language.t("common.requestFailed")),
                    }),
                  )
                return
              }

              if (event.canceled || !isSortable(source) || source.initialIndex === source.index) return
              props.onReorder(
                ServerConnection.key(conn()),
                arrayMove(
                  projects().map((project) => project.id),
                  source.initialIndex,
                  source.index,
                ),
              )
            }}
          >
            <Key each={visible()} by={(project) => `${ServerConnection.key(conn())}:${project.id}`}>
              {(project, index) => {
                const key = () => `${server()}:${project().id}`

                // A session belongs to the project resolved by the runtime, even when its working directory is a
                // secondary worktree or sandbox. Grouping by the project id keeps those sessions nested under the
                // project instead of making them appear as unrelated top-level rows.
                const projectSessions = () => records().filter((record) => record.project.id === project().id)

                const worktreeGroups = createMemo(() => {
                  const groups = new Map<string, HomeSessionRecord[]>()
                  const directories = [project().worktree, ...project().worktrees.map((item) => item.directory)]

                  directories.forEach((directory) => groups.set(pathKey(directory), []))
                  projectSessions().forEach((record) => {
                    const key = pathKey(record.session.location.directory)
                    groups.set(key, [...(groups.get(key) ?? []), record])
                  })

                  return [...groups.entries()].map(([key, records]) => ({
                    key,
                    directory: records[0]?.session.location.directory ?? directories.find((item) => pathKey(item) === key)!,
                    records,
                  }))
                })

                // The default worktree repeats the project name. Codex places sessions directly under that project,
                // while retaining the worktree row when a project has multiple worktrees.
                const hideDefaultWorktree = (worktree: { directory: string }) =>
                  worktreeGroups().length === 1 &&
                  getFilename(worktree.directory).toLocaleLowerCase() === displayName(project()).toLocaleLowerCase()

                return (
                  <ProjectRow
                    project={project()}
                    server={conn()}
                    actions={projectActions}
                    index={index()}
                    // Codex keeps the active project hierarchy visible on first use. An explicit persisted
                    // value still wins so a user's collapse choice is respected on later launches.
                    expanded={props.state.expanded[key()] ?? projectSessions().length > 0}
                    onToggle={() => {
                      props.onExpand(key())
                    }}
                  >
                    <For each={worktreeGroups()}>
                      {(worktree) => (
                        <div
                          class="min-w-0"
                          classList={{
                            "ms-5 border-s border-v2-border-border-muted ps-2": !hideDefaultWorktree(worktree),
                          }}
                        >
                          <Show when={!hideDefaultWorktree(worktree)}>
                            <div class="flex h-6 min-w-0 items-center gap-1.5 text-11-medium text-v2-text-text-faint" title={worktree.directory}>
                              <Icon name="branch" size="small" class="shrink-0 text-v2-icon-icon-muted" />
                              <span class="min-w-0 truncate">{getFilename(worktree.directory) || worktree.directory}</span>
                              <span class="ms-auto shrink-0 tabular-nums">{worktree.records.length || ""}</span>
                            </div>
                          </Show>
                          <Key
                            each={worktree.records}
                            by={(record) => record.session.id}
                            fallback={
                              <div class="pe-2 py-1 text-11-regular text-v2-text-text-faint">
                                {language.t("sidebar.organize.empty")}
                              </div>
                            }
                          >
                            {(record) => (
                              <ProjectSessionRow
                                server={ServerConnection.key(conn())}
                                session={record().session}
                                openTab={props.isOpenTab(ServerConnection.key(conn()), record().session.id)}
                                active={
                                  props.highlightActive &&
                                  props.currentTab?.type === "session" &&
                                  props.currentTab.server === ServerConnection.key(conn()) &&
                                  props.currentTab.sessionId === record().session.id
                                }
                                onOpen={() => {
                                  actions.openProjectSession(conn(), worktree.directory, record().session, { preview: true })
                                }}
                              />
                            )}
                          </Key>
                        </div>
                      )}
                    </For>
                  </ProjectRow>
                )
              }}
            </Key>
            </DragDropProvider>
            <Show when={recentSessions().length > 0}>
            <section class="mt-3 flex shrink-0 flex-col gap-1" aria-labelledby="sidebar-organized-recent">
              <div id="sidebar-organized-recent" class="flex h-6 items-center px-2 text-[13px] leading-4 font-medium text-v2-text-text-muted">
                {language.t("sidebar.recent.section.recent")}
              </div>
              <For each={recentSessions()}>
                {(record) => (
                  <ProjectSessionRow
                    server={ServerConnection.key(conn())}
                    session={record.session}
                    openTab={props.isOpenTab(ServerConnection.key(conn()), record.session.id)}
                    active={
                      props.highlightActive &&
                      props.currentTab?.type === "session" &&
                      props.currentTab.server === ServerConnection.key(conn()) &&
                      props.currentTab.sessionId === record.session.id
                    }
                    onOpen={() => {
                      actions.openProjectSession(conn(), record.session.location.directory, record.session, { preview: true })
                    }}
                  />
                )}
              </For>
              <Show when={records().length > local.recentLimit}>
                <Button
                  variant="ghost-muted"
                  size="small"
                  class="w-full justify-start px-2"
                  onClick={() => setLocal("recentLimit", (value) => value + 5)}
                >
                  {language.t("sidebar.organize.showMore")}
                </Button>
              </Show>
            </section>
            </Show>
          </>
        )}
      </Show>
      <Show when={projects().length > 7}>
        <Button
          variant="ghost-muted"
          size="small"
          class="ms-[23px] self-start"
          onClick={() => setLocal("showAll", (value) => !value)}
        >
          {language.t(local.showAll ? "sidebar.organize.showLess" : "sidebar.organize.showMore")}
        </Button>
      </Show>
    </>
  )
}

function ProjectRow(props: {
  project: Project
  server: ServerConnection.Any
  actions: ReturnType<typeof createProjectActions>
  index: number
  expanded: boolean
  onToggle: () => void
  children: JSX.Element
}) {
  const language = useLanguage()

  const [menu, setMenu] = createStore({ open: false })

  const sortable = useSortable({
    get id() {
      return props.project.id
    },
    get index() {
      return props.index
    },
  })

  const droppable = useDroppable({
    id: `project:${props.project.id}`,
    data: { type: "project", projectID: props.project.id, directory: props.project.worktree },
  })

  return (
    <div
      ref={(element) => {
        sortable.ref(element)
        droppable.ref(element)
      }}
      class="relative shrink-0"
      classList={{ "bg-v2-background-base-hover": droppable.isDropTarget() }}
    >
      <HoverCard openDelay={350} placement="right-start" gutter={6}>
        <HoverCard.Trigger as="div">
          <div
            class="group/project relative flex h-7 min-w-0 shrink-0 items-center rounded-[6px] pe-1 hover:bg-v2-overlay-simple-overlay-hover has-[:focus-visible]:bg-v2-overlay-simple-overlay-hover"
        onContextMenu={(event) => {
          event.preventDefault()
          setMenu("open", true)
        }}
        onKeyDown={(event) => {
          if (event.key !== "ContextMenu" && (event.key !== "F10" || !event.shiftKey)) return
          event.preventDefault()
          setMenu("open", true)
        }}
      >
        <button
          type="button"
          class="flex h-full min-w-0 flex-1 shrink-0 cursor-default items-center gap-2 rounded-[6px] bg-transparent px-2 text-start text-[13px] leading-[var(--line-height-compact)] text-v2-text-text-muted [font-weight:440] transition-colors duration-[120ms] ease-in-out group-hover/project:text-v2-text-text-base focus-visible:text-v2-text-text-base focus-visible:outline-none"
          aria-expanded={props.expanded}
          onClick={props.onToggle}
        >
          <span class="flex size-4 shrink-0 items-center justify-center">
            <ProjectIcon project={props.project} />
          </span>
          <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" dir="auto">
            {displayName(props.project)}
          </span>
        </button>
        <span
          data-project-action
          data-menu={menu.open}
          class="hover-reveal flex shrink-0 items-center gap-1 group-hover/project:opacity-100 focus-within:opacity-100 data-[menu=true]:opacity-100"
        >
          <Menu
            gutter={6}
            modal={false}
            placement="bottom-end"
            open={menu.open}
            onOpenChange={(open) => setMenu("open", open)}
          >
            <Menu.Trigger
              as={IconButton}
              variant="ghost-muted"
              size="small"
              icon={<Icon name="outline-dots" />}
              aria-label={language.t("common.moreOptions")}
            />
            <Menu.Portal>
              <Menu.Content>
                <ProjectMenuItems
                  server={props.server}
                  project={props.project}
                  unread={props.actions.hasUnread(props.server, props.project)}
                  canImportSession={props.actions.canImportSession}
                  importingSession={props.actions.importingSession()}
                  canRevealProject={props.actions.canReveal}
                  onOpenProjectNewSession={props.actions.openNewSession}
                  onImportSession={props.actions.importSession}
                  onEditProject={props.actions.edit}
                  onRevealProject={props.actions.reveal}
                  onClearNotifications={props.actions.clearNotifications}
                  onHideProject={props.actions.hide}
                />
              </Menu.Content>
            </Menu.Portal>
          </Menu>
          <IconButton
            icon={<Icon name="edit" />}
            variant="ghost-muted"
            size="small"
            aria-label={language.t("command.session.new")}
            onClick={() => props.actions.openNewSession(props.server, props.project.worktree)}
          />
        </span>
          </div>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content class="z-50 w-56 rounded-xl border border-v2-border-border-muted bg-v2-background-bg-base p-3 shadow-[var(--v2-elevation-floating)]">
            <div class="text-[13px] font-medium text-v2-text-text-base">{displayName(props.project)}</div>
            <div class="mt-1 text-[12px] text-v2-text-text-muted">{props.project.worktrees.length} 个工作树</div>
            <div class="mt-1 truncate text-[12px] text-v2-text-text-faint" title={props.project.worktree}>{props.project.worktree}</div>
            <div class="mt-2 border-t border-v2-border-border-muted pt-2 text-[12px] text-v2-text-text-muted">编辑项目</div>
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard>
      <Show when={props.expanded}>
        <div data-project-action class="flex flex-col gap-[3px] pb-1">
          {props.children}
        </div>
      </Show>
    </div>
  )
}
