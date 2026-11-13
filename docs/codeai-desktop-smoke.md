# CodeAI Windows desktop smoke test

Use the latest installer at `dist/desktop/codeai-desktop-win-x64.exe`. This checklist is intentionally short and checks the production route rather than the historical HTML prototype.

1. Launch CodeAI and confirm the window title and application identity say `CodeAI`.
2. Open a project with at least one Worktree and one existing Session. Confirm the left hierarchy is `Project → Worktree → Session`, then select a second Worktree or Project and confirm its most recent Session opens.
3. Start a read-only task. Confirm the center shows the task, current status, result, and Composer; it must not render the old chat-bubble timeline as the primary layout.
4. Expand Run details. Confirm tool steps, changed files, and pending approval are hidden by default and visible after expansion. If approval is requested, click `Approve once` and confirm the Run continues.
5. Open a file or preview from the task. Confirm the Artifact tab makes the right region appear. Close the last Artifact tab and confirm the right region disappears while the center expands.
6. Switch to another Session and confirm the Run center, Composer, activity events, and Artifact region belong to the selected Session rather than the previous one.

Record the result in `tasks/todo.md`, including the package version/date and any failed step. Do not use `ui-prototype/codex-v4.html` as the test target.
