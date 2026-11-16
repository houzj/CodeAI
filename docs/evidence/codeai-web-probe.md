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
- [Continuous input probe result](../../.cache/codeai-web-continuous-input.json)

The Web probe created a real Project and Session through the running Runtime. The screenshot shows the Project → Worktree → Session hierarchy, a session route without a top-level application session Tab, the real worktree path, the Composer and the Run timeline.

The initial hover implementation rendered its card inside the sidebar scroll container, so the card was clipped outside the sidebar. The implementation now uses a portalled HoverCard. The live DOM probe confirmed the portalled project card contains the project name, worktree count, directory and edit entry after hover.

The same live DOM probe confirmed the session card contains the session title, update state and project name after hovering the session row.

The browser-first Runtime probe created Session `ses_e1c5d8508ffeintbxKxNgKRYNn` under the `E:\CodeAI` project and admitted `CONTINUOUS_A` and `CONTINUOUS_B` concurrently. Both HTTP admissions returned 200. The latest run observed `CONTINUOUS_A` in Session history and `CONTINUOUS_B` in the durable inbox with `delivery: steer`. A fast drain is also accepted when the second prompt has already moved from inbox to history. This verifies continuous input admission without waiting for the previous run to become idle.

The workspace probe `Invoke-CodeAIWebWorkspaceProbe.ps1` completed against the same Runtime. It observed Git provider `git`, current branch `dev`, 30 VCS status entries and 50 branch entries. Permission evaluation for the current worktree returned `allow` with zero pending requests. A Local Artifact was created for the probe Session, read back with `index.html`, and deleted successfully. The machine-readable result is `.cache/codeai-web-workspace.json`.

Connection boundary verification returned `401` for unauthenticated `/api/project` and `200` with the configured local Basic credential. This confirms the web Runtime is reachable while unauthenticated callers remain blocked.

## Scope

This is a Web evidence slice. Windows packaging remains a separate final-host gate.

## REA release evidence

REA `audit_release_exposure` inspected the installed `resources/app.asar` and returned Evidence ID `ev_e3759d778e89b05c96fbb05de413db4b7cb396f770874b9fbdc98de9091614f0`. The selected ASAR digest was `1494c47eef53edd4d585a5bce13615b65aa4bb5279f22e2f1a9e988ebdad5ecd`.

The audit observed low-severity packaged payload exposure and native PDB path strings. Credential-marker scanning reported no observed hits within its bounded scan. Electron fuse checks remain unknown because the ASAR does not contain the Electron executable, so the final desktop executable must be audited separately.

REA `inspect_electron_fuses` inspected the currently installed `CodeAI.exe` and returned Evidence ID `ev_9001aa5b9505830c02edcff3746a19705b863ad31540a375d5021c617cc62294`. The executable digest was `99340de9f07d077e5957bdfb63a41326b7a74a43069b8c8da091acd8477ab61a`.

The installed development package currently has `RunAsNode`, `NodeOptions`, and `NodeCliInspectArguments` enabled. `OnlyLoadAppFromAsar`, `EmbeddedAsarIntegrityValidation`, and cookie encryption are disabled. These are release-hardening gaps to close before publishing the Windows installer. This finding belongs to the packaging gate and does not block the web Runtime probe.

The current unsigned Windows build completed with `bun run build` and `bun run pack`. The unpacked artifact is under `dist/desktop/app`. REA fuse evidence `ev_15dc857802a6702bc3f631e2e6c663baaa7e7cb64acd1544ed5b1e40dfd5bd97` inspected `dist/desktop/app/CodeAI.exe` with SHA-256 `888a5e36e699b2332bc100f86f49fc11f5cba3b999cd6a490a0a9857516d546e`. The release executable still reports RunAsNode, NodeOptions and NodeCliInspectArguments enabled, with embedded ASAR integrity and app-ASAR-only loading disabled.

REA release audit `ev_b821f7cf2c7d7ab235a3b3ff6941f83f59fe7c28d7778cb589273e679dc347c0` inspected the current `app.asar` with SHA-256 `583ba991947fa61deac38161d3725b5c8f8d8c10d494323f32402e9437655f0a`. It observed only low-severity extractable payload and native PDB path exposure within the assessed checks. Source-map and credential checks remained partially unknown because the bounded audit omitted members. Final release hardening remains open until Electron fuses are configured and a full-size release audit is rerun.

The source brand scan now passes after replacing user-visible upstream links, provider labels, notifications, localized display text, feedback routes, and generated desktop metadata with CodeAI equivalents. Compatibility identifiers, Provider IDs, migration keys, and internal SDK names remain scoped as technical implementation details.

## Current web-only acceptance

The browser-first verification was rerun against Vite `http://127.0.0.1:3001/` and Runtime `http://127.0.0.1:4097/` after forcing the project-sidebar layout. The rendered page now keeps Project → Worktree → Session as the only CodeAI session navigation surface. The app no longer renders the legacy horizontal session strip. The browser's own tabs remain browser chrome and are outside the CodeAI page.

- [Current project-sidebar render](../../.cache/codeai-web-final.png)
- [Project hover card render](../../.cache/codeai-web-project-hover-final.png)
- [Session hover render](../../.cache/codeai-web-session-hover.png)

Agent Desktop evidence observed `Projects and sessions`, the `CodeAI` project row, nested worktree/session rows, and the portalled project hover card containing `CodeAI`, `1个工作树`, `E:\CodeAI`, and `编辑项目`. The session row is also rendered through the portalled hover-card implementation in `packages/app/src/shell/titlebar/project-session-row.tsx`; its status line now derives from `SessionInfo.time.busy/idle` and `time.updated`, and its directory comes from `SessionInfo.location.directory`.

The desktop package was rebuilt with Electron fuses configured in source, but the packaged executable remains a manual release gate per the current workflow. REA fuse evidence `ev_5f503ee8bb28c075587f81b761e3bcd4d150b75766ca1426596b34eb4749ceec` reported RunAsNode, NodeOptions and NodeCliInspectArguments disabled, cookie encryption enabled, embedded ASAR integrity enabled, and app-ASAR-only loading enabled.

REA capability discovery also confirmed the Ghidra provider is available on this Windows host. It is selected by `open_binary` when a native target is opened, rather than exposed as a separate `mcp__ghidra__*` server.

Validation after the branding pass completed with app typecheck, desktop typecheck, and the production app build. The app build emitted existing CSS selector and chunk-size warnings, but completed successfully.
