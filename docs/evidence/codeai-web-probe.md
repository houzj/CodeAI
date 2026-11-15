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

## Scope

This is a Web evidence slice. Windows packaging remains a separate final-host gate.
