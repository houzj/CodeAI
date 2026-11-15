import { resolveChannel } from "./utils"

const arg = process.argv[2]

const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

const appId = channel === "prod" ? "ai.codeai.desktop" : `ai.codeai.desktop.${channel}`

const productName = channel === "prod" ? "CodeAI" : `CodeAI ${channel.charAt(0).toUpperCase() + channel.slice(1)}`

const summary = `CodeAI desktop coding agent${channel !== "prod" ? ` (${channel})` : ""}`

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="ly.anoma">
    <name>Anomaly Innovations Inc.</name>
  </developer>

  <description>
    <p>
      CodeAI is a desktop coding agent for working with any supported AI model.
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">https://github.com/houzj/CodeAI/issues</url>
  <url type="homepage">https://github.com/houzj/CodeAI</url>
  <url type="vcs-browser">https://github.com/houzj/CodeAI</url>

</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)

console.log(`Generated metainfo for ${channel} at resources/${appId}.metainfo.xml`)
