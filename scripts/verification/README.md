# CodeAI desktop verification

Use `Invoke-CodeAIAgentDesktop.ps1` as the single entry point for Windows desktop checks. It locates the CodeAI window again for every action and never reuses stale accessibility references.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Screenshot
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Smoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Close
```

`Smoke` is the regression gate for the Codex-style shell. It checks that project/session navigation is present and fails while legacy top-level session tabs are still exposed. Add future hover and project/session assertions to the same script so the test flow stays reproducible.

Use `Invoke-CodeAIWebProbe.ps1` for the browser-first Runtime probe. It discovers the real CodeAI project, creates a disposable Session through the HTTP API, admits two prompts in immediate succession without waiting for model execution, and verifies that both admissions return 200 while both prompts converge in durable inbox or Session history. The probe deletes its temporary Session by default. Pass `-KeepSession` when a rendered session must remain available for inspection.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIWebProbe.ps1
```

Use `Invoke-CodeAIWebRuntime.ps1` to start or inspect the development Runtime without probing a non-existent health endpoint. It treats an authenticated API response of `401` as a live server, tolerates an offline `curl` probe while starting, waits for a cold packaged CLI to boot, records only the PID it started, and refuses to stop a different executable. `packages/app/script/dev-connected.ts` resolves the unpacked CLI first and falls back to the current packaged CLI under `dist/desktop/app/resources`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIWebRuntime.ps1 -Action Start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIWebRuntime.ps1 -Action Status
```

The script writes its machine-readable result to `.cache/codeai-web-continuous-input.json`. The second prompt may be observed in the durable inbox or already projected into Session history when the Runtime drains quickly. Both are valid durable outcomes.

Use `Invoke-CodeAIWebWorkspaceProbe.ps1` for the browser-first G3/G4 API loop. It verifies the real Git provider, branch and status, PermissionBroker evaluation, and Local Artifact create/read/delete cleanup.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIWebWorkspaceProbe.ps1
```

The workspace probe also deletes its temporary Session by default. Pass `-KeepSession` when inspecting its project or Artifact state in the browser.

Use `Invoke-CodeAICollaborationProbe.ps1` to verify the parent/worker Session relationship and a durable `task.assigned` synthetic Inbox message. It deletes the parent and child Session tree by default. Pass `-KeepSessions` for manual inspection.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAICollaborationProbe.ps1
```

Use `Invoke-CodeAIObjectiveProbe.ps1` to verify the Goal active/paused lifecycle and a one-second Schedule wake-up in one disposable Session. It cleans the Schedule and Session by default. Pass `-KeepSession` for manual inspection.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIObjectiveProbe.ps1
```

Use `Invoke-CodeAIPlanProbe.ps1` to verify Plan Agent selection, the persisted Plan mode reminder and a real Plan response. It deletes the temporary Session by default. Pass `-KeepSession` for manual inspection.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIPlanProbe.ps1
```

The desktop probe follows the upstream `agent-desktop` 2.6 loop. It runs `status` and the bundled `skills get desktop` and `skills get platform` guides before use, restores a minimized window before taking a fresh snapshot, quotes every PowerShell ref, and verifies each state-changing action with a new snapshot. An `AMBIGUOUS_TARGET` result is treated as a non-retryable duplicate control. The probe keeps semantic actions headless and only uses `--headed` for actions that require physical input.

Reference implementation and command semantics are documented in the [agent-desktop repository](https://github.com/vercel-labs/agent-desktop).

The original Codex is deliberately isolated in `Invoke-CodexReferenceAgentDesktop.ps1`. Use it only when a UI semantic gap needs fresh reference evidence.

```powershell
powershell -File scripts/verification/Invoke-CodexReferenceAgentDesktop.ps1 -Action Start
powershell -File scripts/verification/Invoke-CodexReferenceAgentDesktop.ps1 -Action Screenshot
powershell -File scripts/verification/Invoke-CodexReferenceAgentDesktop.ps1 -Action Close
```
