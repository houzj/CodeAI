import type { PermissionRuleset } from "@opencode/client/promise"

export type CodeAIPermissionMode = "allow" | "ask" | "deny" | "unknown"
export type CodeAIEnvironment = "local" | "worktree" | "isolated-workspace" | "unknown"

export type CodeAIAgentPolicy = {
  environment: CodeAIEnvironment
  filesystem: {
    read: string[]
    write: string[]
    external: CodeAIPermissionMode
  }
  commands: CodeAIPermissionMode
  network: "unknown"
  approval: "once" | "run" | "session" | "project"
  context: {
    compaction: "runtime-managed"
    threshold: "runtime-managed"
  }
  capabilities: {
    sandbox: "workspace-scoped" | "runtime-native" | "unknown"
    osIsolation: "unknown"
  }
}

/** Projects OpenCode's permission rules into CodeAI's product policy without claiming stronger isolation. */
export function projectCodeAIPolicy(input: {
  directory: string
  worktree?: boolean
  isolatedWorkspace?: boolean
  permissions?: PermissionRuleset
}): CodeAIAgentPolicy {
  const rules = input.permissions ?? []
  const effect = (actions: readonly string[], fallback: CodeAIPermissionMode) => {
    const matching = rules.filter((rule) => actions.includes(rule.action))
    if (matching.length === 0) return fallback
    if (matching.some((rule) => rule.effect === "deny")) return "deny"
    if (matching.some((rule) => rule.effect === "ask")) return "ask"
    return "allow"
  }

  return {
    environment: input.isolatedWorkspace ? "isolated-workspace" : input.worktree ? "worktree" : "local",
    filesystem: {
      read: [input.directory],
      write: [input.directory],
      external: effect(["external_directory"], "ask"),
    },
    commands: effect(["bash", "shell", "tool.execute"], "ask"),
    network: "unknown",
    approval: "once",
    context: { compaction: "runtime-managed", threshold: "runtime-managed" },
    capabilities: {
      sandbox: input.isolatedWorkspace || input.worktree ? "workspace-scoped" : "unknown",
      osIsolation: "unknown",
    },
  }
}
