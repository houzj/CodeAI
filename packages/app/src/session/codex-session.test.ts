import type { SessionInfo } from "@opencode/client/promise"
import { describe, expect, test } from "bun:test"
import type { Project } from "@/runtime/server/types"
import { selectCodexSessionSnapshot } from "./codex-session"

const session = (input: Partial<SessionInfo> = {}) => ({
  id: "ses_1",
  projectID: "project_1",
  title: "Provider settings flow",
  location: { directory: "E:/CodeAI/.worktrees/provider" },
  cost: 0,
  tokens: {},
  time: { created: 1, updated: 2 },
  ...input,
}) as SessionInfo

const project = {
  id: "project_1",
  name: "CodeAI",
  worktree: "E:/CodeAI",
  worktrees: [{ directory: "E:/CodeAI/.worktrees/provider", strategy: "git" }],
  sandboxes: ["E:/CodeAI/.worktrees/provider"],
} as Project

describe("Codex session snapshot", () => {
  test("projects Project, Worktree, and Session as separate levels", () => {
    const snapshot = selectCodexSessionSnapshot({ session: session({ model: { providerID: "openai", id: "coder-large" } }), project })

    expect(snapshot).toEqual({
      project: { id: "project_1", name: "CodeAI", worktree: "E:/CodeAI" },
      worktree: { directory: "E:/CodeAI/.worktrees/provider", name: "provider", isSandbox: true },
      session: {
        id: "ses_1",
        title: "Provider settings flow",
        directory: "E:/CodeAI/.worktrees/provider",
        model: { providerID: "openai", modelID: "coder-large" },
      },
    })
  })

  test("falls back to the session directory when project metadata is unavailable", () => {
    const snapshot = selectCodexSessionSnapshot({ session: session({ title: undefined }) })

    expect(snapshot.project).toEqual({ id: "project_1", name: "provider", worktree: "E:/CodeAI/.worktrees/provider" })
    expect(snapshot.worktree).toMatchObject({ name: "provider", isSandbox: false })
    expect(snapshot.session.title).toBe("New session")
  })
})
