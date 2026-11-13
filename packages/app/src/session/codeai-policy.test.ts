import { describe, expect, test } from "bun:test"
import { projectCodeAIPolicy } from "./codeai-policy"

describe("CodeAI policy projection", () => {
  test("does not claim OS sandboxing for an OpenCode worktree", () => {
    const policy = projectCodeAIPolicy({
      directory: "E:/CodeAI/.worktrees/feature",
      worktree: true,
      permissions: [
        { action: "bash", resource: "*", effect: "ask" },
        { action: "external_directory", resource: "*", effect: "deny" },
      ],
    })

    expect(policy.environment).toBe("worktree")
    expect(policy.capabilities.sandbox).toBe("workspace-scoped")
    expect(policy.capabilities.osIsolation).toBe("unknown")
    expect(policy.commands).toBe("ask")
    expect(policy.filesystem.external).toBe("deny")
  })

  test("keeps unknown runtime capabilities explicit", () => {
    const policy = projectCodeAIPolicy({ directory: "E:/CodeAI" })

    expect(policy.network).toBe("unknown")
    expect(policy.context).toEqual({ compaction: "runtime-managed", threshold: "runtime-managed" })
  })
})
