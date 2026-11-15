# CodeAI desktop verification

Use `Invoke-CodeAIAgentDesktop.ps1` as the single entry point for Windows desktop checks. It locates the CodeAI window again for every action and never reuses stale accessibility references.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Screenshot
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Smoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Close
```

`Smoke` is the regression gate for the Codex-style shell. It checks that project/session navigation is present and fails while legacy top-level session tabs are still exposed. Add future hover and project/session assertions to the same script so the test flow stays reproducible.

Use `Invoke-CodeAIWebProbe.ps1` for the browser-first Runtime probe. It discovers the real CodeAI project, creates a disposable Session through the HTTP API, admits two prompts concurrently, and verifies that both admissions return 200 while the second prompt remains in the Session inbox.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIWebProbe.ps1
```

The script writes its machine-readable result to `.cache/codeai-web-continuous-input.json`.

The original Codex is deliberately isolated in `Invoke-CodexReferenceAgentDesktop.ps1`. Use it only when a UI semantic gap needs fresh reference evidence.

```powershell
powershell -File scripts/verification/Invoke-CodexReferenceAgentDesktop.ps1 -Action Start
powershell -File scripts/verification/Invoke-CodexReferenceAgentDesktop.ps1 -Action Screenshot
powershell -File scripts/verification/Invoke-CodexReferenceAgentDesktop.ps1 -Action Close
```
