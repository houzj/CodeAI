import { join } from "node:path"

const port = process.env.VITE_OPENCODE_SERVER_PORT ?? "4097"
const cli = process.env.CODEAI_CLI ?? join(import.meta.dir, "../../desktop/dist/win-unpacked/resources/opencode-cli.exe")
const password = process.env.CODEAI_DEV_PASSWORD ?? "codeai-dev-local"
const state = join(import.meta.dir, "../../../.cache/dev-runtime")
await Promise.all([
  Bun.$`mkdir -p ${join(state, "config")} ${join(state, "data")} ${join(state, "cache")} ${join(state, "state")}`,
])

const runtime = Bun.spawn([cli, "serve", "--hostname", "127.0.0.1", "--port", port], {
  stdout: "inherit",
  stderr: "inherit",
  env: {
    ...process.env,
    OPENCODE_PASSWORD: password,
    XDG_CONFIG_HOME: join(state, "config"),
    XDG_DATA_HOME: join(state, "data"),
    XDG_CACHE_HOME: join(state, "cache"),
    XDG_STATE_HOME: join(state, "state"),
  },
})

const vite = Bun.spawn([process.execPath, "run", "dev", "--", "--host", "127.0.0.1"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  env: {
    ...process.env,
    VITE_OPENCODE_SERVER_PORT: port,
    VITE_OPENCODE_SERVER_PASSWORD: password,
  },
})

const exit = await vite.exited
runtime.kill()
process.exit(exit)
