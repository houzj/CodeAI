import { Icon } from "@opencode/ui/icon"

export function GlobalRail(props: {
  home: () => void
  search: () => void
  toggleSidebar: () => void
  settings: () => void
}) {
  return (
    <nav
      data-slot="global-rail"
      aria-label="Global navigation"
      class="relative z-20 flex w-10 shrink-0 flex-col items-center border-e border-v2-border-border-muted bg-v2-background-bg-deep py-2"
    >
      <div class="flex w-full flex-col items-center gap-1">
        <RailButton icon="grid-plus" label="Home" onClick={props.home} />
        <RailButton icon="search" label="Search sessions" onClick={props.search} />
        <RailButton icon="workspace" label="Projects and sessions" onClick={props.toggleSidebar} active />
      </div>
      <div class="mt-auto flex w-full flex-col items-center gap-1">
        <RailButton icon="settings-gear" label="Settings" onClick={props.settings} />
      </div>
    </nav>
  )
}

function RailButton(props: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      data-state={props.active ? "active" : undefined}
      class="flex size-8 items-center justify-center rounded-[7px] text-v2-icon-icon-muted transition-colors hover:bg-v2-background-bg-layer-02 hover:text-v2-icon-icon-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-v2-border-border-focus data-[state=active]:bg-v2-background-bg-layer-02 data-[state=active]:text-v2-text-text-base"
      onClick={props.onClick}
    >
      <Icon name={props.icon} size="small" />
    </button>
  )
}
