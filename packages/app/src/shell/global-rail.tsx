import { Icon } from "@opencode/ui/icon"
import { useLanguage } from "@/runtime/i18n/language"

export function GlobalRail(props: {
  home: () => void
  search: () => void
  settings: () => void
}) {
  const language = useLanguage()

  return (
    <nav
      data-slot="global-rail"
      aria-label={language.t("command.category.view")}
      class="relative z-20 flex w-10 shrink-0 flex-col items-center border-e border-v2-border-border-muted bg-v2-background-bg-deep py-2"
    >
      <div class="flex w-full flex-col items-center gap-1">
        <RailButton icon="grid-plus" label={language.t("home.title")} onClick={props.home} />
        <RailButton icon="search" label={language.t("command.session.search")} onClick={props.search} />
      </div>
      <div class="mt-auto flex w-full flex-col items-center gap-1">
        <RailButton icon="settings-gear" label={language.t("command.settings.open")} onClick={props.settings} />
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
