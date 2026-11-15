# CodeAI desktop verification

Use `Invoke-CodeAIAgentDesktop.ps1` as the single entry point for Windows desktop checks. It locates the CodeAI window again for every action and never reuses stale accessibility references.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Screenshot
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Smoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verification/Invoke-CodeAIAgentDesktop.ps1 -Action Close
```

`Smoke` is the regression gate for the Codex-style shell. It checks that project/session navigation is present and fails while legacy top-level session tabs are still exposed. Add future hover and project/session assertions to the same script so the test flow stays reproducible.
