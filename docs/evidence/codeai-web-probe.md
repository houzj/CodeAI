# CodeAI Web probe

## Run

- Web UI: `http://127.0.0.1:3000/`
- Runtime: `http://127.0.0.1:4097/`
- Project: `CodeAI`
- Worktree: `E:\CodeAI`
- Session: `CodeAI web probe session`

## Evidence

- [Project/session Web screenshot](../../.cache/codeai-web-session.png)
- [Settled Web screenshot](../../.cache/codeai-web-final.png)
- [Project hover capture](../../.cache/hover-project-fixed.png)

The Web probe created a real Project and Session through the running Runtime. The screenshot shows the Project → Worktree → Session hierarchy, a session route without a top-level application session Tab, the real worktree path, the Composer and the Run timeline.

The initial hover implementation rendered its card inside the sidebar scroll container, so the card was clipped outside the sidebar. The implementation now uses a portalled HoverCard. The live DOM probe confirmed the portalled project card contains the project name, worktree count, directory and edit entry after hover.

The same live DOM probe confirmed the session card contains the session title, update state and project name after hovering the session row.

## Scope

This is a Web evidence slice. Windows packaging remains a separate final-host gate.

## REA release evidence

REA `audit_release_exposure` inspected the installed `resources/app.asar` and returned Evidence ID `ev_e3759d778e89b05c96fbb05de413db4b7cb396f770874b9fbdc98de9091614f0`. The selected ASAR digest was `1494c47eef53edd4d585a5bce13615b65aa4bb5279f22e2f1a9e988ebdad5ecd`.

The audit observed low-severity packaged payload exposure and native PDB path strings. Credential-marker scanning reported no observed hits within its bounded scan. Electron fuse checks remain unknown because the ASAR does not contain the Electron executable, so the final desktop executable must be audited separately.
