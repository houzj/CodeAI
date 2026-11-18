import { createSignal, For, Show } from "solid-js"
import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitleGroup } from "@opencode/ui/dialog"
import { useDialog } from "@opencode/ui/context/dialog"
import { Icon } from "@opencode/ui/icon"
import { TextInput } from "@opencode/ui/text-input"
import { useLanguage } from "@/runtime/i18n/language"
import { ServerConnection, type ServerConnection as ServerConnectionType } from "@/runtime/server/registry"
import { useGlobal } from "@/runtime/server/runtime"
import { useDirectoryPicker } from "@/workspaces/selection/picker"
import { addProjects } from "./add"
import { homeProjectDirectories } from "@/shell/layout/helpers"
import { getFilename } from "@opencode/util/path"
import { errorMessage } from "@/shell/layout/helpers"
import { showToast } from "@/shell/notifications/toast"

export function CreateProjectDialog(props: { server: ServerConnectionType.Any }) {
  const dialog = useDialog()
  const language = useLanguage()
  const global = useGlobal()
  const pickDirectory = useDirectoryPicker()
  const [name, setName] = createSignal("")
  const [directories, setDirectories] = createSignal<string[]>([])
  const [saving, setSaving] = createSignal(false)

  const addSourceFolders = () => {
    pickDirectory({
      server: props.server,
      title: "添加源文件夹",
      multiple: true,
      onSelect: (result) => {
        const selected = homeProjectDirectories(result)

        if (selected.length === 0) return

        setDirectories((current) => [...new Set([...current, ...selected])])
      },
    })
  }

  const create = async () => {
    const current = global.serverCtx(ServerConnection.key(props.server))
    const projectName = name().trim()
    const sourceFolders = directories()

    if (!current || !projectName || sourceFolders.length === 0) return

    setSaving(true)

    try {
      const project = await addProjects(current, sourceFolders)

      if (project && project.id !== "global") {
        const updated = await current.sdk.api.project.update({ projectID: project.id, name: projectName })
        current.sync.project.update(updated)
      }

      dialog.close()
    } catch (cause) {
      showToast({
        variant: "error",
        title: language.t("common.requestFailed"),
        description: errorMessage(cause, language.t("common.requestFailed")),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog fit containerClass="w-[min(520px,calc(100vw-32px))]">
      <DialogHeader>
        <DialogTitleGroup title={<span class="text-[20px] font-semibold leading-6">创建项目</span>} />
      </DialogHeader>
      <DialogBody class="gap-5">
        <div class="relative w-full">
          <Icon name="folder" size="small" class="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 text-v2-icon-icon-muted" />
          <TextInput
            autofocus
            value={name()}
            placeholder="项目名称"
            onInput={(event) => setName(event.currentTarget.value)}
            class="ps-9"
          />
        </div>
        <div class="flex flex-col gap-2">
          <div class="text-[13px] font-medium text-v2-text-text-base">源文件夹</div>
          <div class="flex min-h-[104px] flex-col items-center justify-center gap-3 rounded-xl border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-4 py-4">
            <Show
              when={directories().length > 0}
              fallback={
                <div class="text-[13px] text-v2-text-text-muted">
                  在此电脑上添加文件夹 <Icon name="fill-triangle-down" size="small" class="inline-block" />
                </div>
              }
            >
              <div class="flex w-full flex-col gap-1">
                <For each={directories()}>
                  {(directory) => (
                    <div class="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-v2-text-text-base">
                      <Icon name="folder" size="small" class="shrink-0 text-v2-icon-icon-muted" />
                      <span class="min-w-0 flex-1 truncate" title={directory}>
                        {getFilename(directory) || directory}
                      </span>
                      <button
                        type="button"
                        class="shrink-0 text-v2-text-text-faint hover:text-v2-text-text-base"
                        aria-label={`移除 ${directory}`}
                        onClick={() => setDirectories((current) => current.filter((item) => item !== directory))}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </Show>
            <Button type="button" variant="neutral" size="small" onClick={addSourceFolders}>
              <Icon name="folder-plus" size="small" />
              添加
            </Button>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => dialog.close()}>
          取消
        </Button>
        <Button type="button" variant="submit" disabled={saving() || !name().trim() || directories().length === 0} onClick={create}>
          {saving() ? "创建中…" : "创建项目"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
