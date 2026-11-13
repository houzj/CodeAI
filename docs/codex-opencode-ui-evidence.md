# Codex UI evidence and OpenCode adaptation

This document records what was observed from the locally installed Codex desktop package and what CodeAI can implement on top of the OpenCode runtime. It deliberately separates observation from inference.

## Evidence source

The local Codex MSIX update package contains `app/resources/app.asar`. The current package was read from:

`C:\Users\Administrator\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\windows-updates\prepared.msix`

The ASAR contains a real `webview/index.html` and 9,467 JavaScript bundles under `webview/assets`. The following strings were found in the shipped bundles:

- `Projects`, `Worktrees`, `New chat`, `Recent`, `Move to project`
- `app.sidebar.show`, `app.sidebar.hide`, `app.sidebar.close`
- `chatgptConversations.sidePanel.toggle`
- `chatgptConversations.composer.projectSelector.change`
- `chatgptConversations.composer.projectSelector.createProject`
- `chatgptConversations.sidebar.project.newChat`
- `chatgptConversations.sidebar.project.collapse` and `expand`
- `chatgptConversations.sidebar.goal`
- `automations.scheduled.composer.placeholder`

These are shipped product strings and code identifiers, not labels inferred from screenshots.

## Observed Codex structure

The evidence supports these separate surfaces:

1. A narrow global rail for product-level navigation and global controls.
2. A project/session sidebar. Projects own conversations; conversations can be moved to another project. The sidebar has collapsed/expanded project groups and recent/session sections.
3. A session workspace with a Composer anchored to the bottom of the session layout. The Composer owns project selection and model/effort controls; the header does not repeat the active model as a second control.
4. A side panel for files, previews, browser tabs, and related artifacts. It is independently shown/hidden and can take a full workspace view.
5. Goal/automation surfaces that are distinct from the normal message timeline.

## OpenCode-compatible mapping

| Codex concept | CodeAI implementation on OpenCode | Status |
| --- | --- | --- |
| Global rail | `GlobalRail` with Home, Projects, Sessions, Worktrees, Panels, Settings | Implementable now |
| Project → conversation hierarchy | Existing organized sidebar, real Session location, `session.move`, drag/drop | Implementable now |
| Worktree | OpenCode project/worktree inventory and session directory | Implementable now |
| Run timeline | OpenCode session messages, parts, tool events and permission events | Implementable now |
| Composer project selector | Session/project creation and move flows | Implementable now |
| Codex cloud sandbox | No equivalent local primitive in OpenCode | Must be labelled local/runtime-managed |
| Goal and scheduled task | New experimental CodeAI Server/Protocol projection over OpenCode SessionExecution | Needs implementation |
| Cross-session collaboration | New durable inbox/message protocol | Needs implementation |
| Cloud side panel integrations | Local Artifact tabs and browser/plugin surfaces | Partial; keep capability-scoped |

## Design rule

Do not add a rail item merely because Codex has one. Every visible CodeAI entry must map to a real OpenCode route, command, or capability. When a Codex feature has no OpenCode primitive, expose it as a clearly marked CodeAI experimental surface or keep it out of the primary navigation until the server contract exists.

The current rail therefore omits “Remote sessions” and generic “More” placeholders. Those labels implied capabilities the OpenCode-backed build does not provide.
