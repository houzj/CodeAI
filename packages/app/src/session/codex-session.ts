import type { SessionInfo } from "@opencode/client/promise"
import type { Project } from "@/runtime/server/types"

export type CodexSessionSnapshot = {
  readonly project: {
    readonly id: string
    readonly name: string
    readonly worktree: string
  }
  readonly worktree: {
    readonly directory: string
    readonly name: string
    readonly isSandbox: boolean
  }
  readonly session: {
    readonly id: string
    readonly title: string
    readonly directory: string
    readonly model?: { readonly providerID: string; readonly modelID: string }
  }
}

export function selectCodexSessionSnapshot(input: { session: SessionInfo; project?: Project }): CodexSessionSnapshot {
  const directory = input.session.location.directory
  const worktree = input.project?.worktrees.find((item) => item.directory === directory)
  const projectWorktree = input.project?.worktree ?? directory

  return {
    project: {
      id: input.session.projectID,
      name: input.project?.name ?? filename(projectWorktree),
      worktree: projectWorktree,
    },
    worktree: {
      directory,
      name: worktree?.directory ? filename(worktree.directory) : filename(directory),
      isSandbox: input.project?.sandboxes.includes(directory) ?? false,
    },
    session: {
      id: input.session.id,
      title: input.session.title || "New session",
      directory,
      model: input.session.model
        ? { providerID: input.session.model.providerID, modelID: input.session.model.id }
        : undefined,
    },
  }
}

function filename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}
