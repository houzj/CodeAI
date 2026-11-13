# CodeAI Agent Workspace v3

This document replaces the earlier card-oriented Run Center design. The target is a Codex-style coding agent workspace whose UI is a projection of durable session and runtime state.

## Product model

```text
Project
  └── Worktree
        └── Session
              ├── Turn
              │     ├── Task admission
              │     ├── Run execution
              │     │     ├── Tool call
              │     │     ├── Approval
              │     │     ├── File change
              │     │     └── Run result
              │     └── Turn summary
              ├── Composer
              └── Artifacts
```

Project and Worktree are navigation scope. Session is the durable conversation. A Run is an execution projection inside a Session; it is not a separate chat message. Tool calls, approvals, file changes and results attach to the Run timeline and remain available after the live event stream ends.

Worktree is also the Git execution boundary. A branch name is metadata on a Worktree, not a replacement for the Worktree itself. File reads, writes, shell commands, diffs and previews resolve against the selected Worktree directory; branch creation and Git status remain server/VCS operations.

## Runtime boundaries

- `SessionStore` owns durable prompt admission and message history.
- `SessionExecution` owns process-local running state and interruption.
- `CodexActivityProjection` folds live events and reconstructs the same Run view from durable assistant/tool history after reload.
- `ComposerController` owns draft text, attachments, model selection, Enter submission, Shift+Enter newline, stop and queue behavior.
- `ArtifactRegion` owns file/preview/log tabs and has independent visibility from the session stream.
- The UI never invents a completed Run from a visual placeholder; empty state means no admitted task.

## Reverse-engineered Codex evidence

The shipped Codex desktop artifact provides stronger evidence than screenshots alone:

- The runtime exposes a real `session.move` operation. Moving a conversation to another Project or Worktree is a domain action with failure handling, not a client-only reorder.
- The desktop sidebar has explicit move-workspace copy and models workspace choices as local repository, existing Git worktree, or new workspace.
- Permission policy is tool-scoped, including read, edit, shell, task/subagent, and external-directory access. Approval UI must resolve a concrete permission request and preserve the decision in the Run.
- Context compaction is a session execution operation with its own threshold and background behavior. It must remain separate from ordinary message rendering and be represented in the session state machine.
- The existing app already contains the correct seams: `SidebarOrganized`, `ProjectSessionRow`, `DragDropProvider`, `session.move`, workspace creation, permission docks, and compaction/session execution state. CodeAI should compose these seams instead of adding a second navigation tree inside the Session route.
- Git integration should reuse the existing Worktree inventory and VCS APIs. The UI should expose branch/status metadata at the Worktree level and never infer a new branch from a Session title.

## Desktop layout contract

1. Global navigation and Project → Worktree → Session navigation are separate from the conversation stream.
2. The center is a scrollable session stream. Each task admission creates a compact task/run group; tool events and changes are inline rows with expandable detail.
3. The Composer is a real bottom layout row. It never overlays or hides session content.
4. The model selector is rendered only in the Composer control row beside submit.
5. The right Artifact region is independent. It consumes width only when a real tab exists; closing the final tab releases that width.
6. Session switching replaces all scoped Run, Composer and Artifact state together.

## Implementation order

1. Remove the duplicate `CodeAIWorkspaceFrame` navigation tree from the Session route and make the global organized sidebar the only Project → Worktree → Session navigation surface.
2. Wire sidebar conversation drag/move to the real `session.move` operation and update the selected Project/Worktree after the server event confirms it.
3. Replace the current single `CodeAIRunCenter` card view with a `SessionStream` projection containing task groups, run status, result, tool rows, approval rows and change summaries.
4. Move activity reconstruction into a pure projection tested against event sequences and durable assistant/tool history.
5. Keep Composer in its dedicated bottom row and remove overlay compensation from the stream.
6. Bind Artifact tabs to the selected Session and verify independent show/hide behavior.
7. Add explicit sandbox, permission, and compaction state to the Session/Run projection before polishing visual details.
8. Validate the packaged desktop against the real Codex evidence checklist; the HTML prototype is not a behavior source.

## Non-goals

The OpenCode protocol/client names remain compatibility boundaries. They do not define the CodeAI product vocabulary or force the UI to look like the OpenCode shell.
