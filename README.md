# Remote Link

Remote Link is an open, self-hostable bridge between AI clients and a computer over the Model Context Protocol (MCP).

The first milestone is intentionally small:

```text
ChatGPT Work / MCP client
          |
          | MCP
          v
     Remote Link
          |
          | local stdio
          v
Desktop Commander OSS
          |
          +-- filesystem
          +-- terminal
          +-- processes
```

Remote Link does **not** reimplement filesystem and terminal automation. It uses the open-source Desktop Commander MCP server as a local execution backend and adds its own permission boundary and, later, remote transport/device layer.

## Status

Early proof of concept. Do not expose it to untrusted users or networks.

### Safe mode (default)

- `remote_link_status`
- `list_directory`
- `read_file`
- `get_file_info`
- `list_processes`
- `core_list_tools`

### Developer mode

Adds:

- `start_process`
- `write_file`
- `edit_block`

### Full mode

Can additionally expose `core_call_tool`, a raw pass-through to the Desktop Commander tool catalog. It is deliberately disabled unless two explicit switches are enabled.

## Requirements

- Node.js 20+
- pnpm
- `npx` available on PATH

Desktop Commander is launched on demand with:

```bash
npx -y @wonderwhy-er/desktop-commander@latest
```

## Run locally

```bash
pnpm install
pnpm start
```

Remote Link is currently a **stdio MCP server**, so normally an MCP host or tunnel starts it for you instead of you typing into it directly.

To inspect it locally:

```bash
pnpm inspect
```

## Permission modes

Safe mode is the default:

```bash
pnpm start
```

Developer mode enables terminal execution and file mutation.

macOS / Linux:

```bash
REMOTE_LINK_MODE=developer pnpm start
```

PowerShell:

```powershell
$env:REMOTE_LINK_MODE="developer"
pnpm start
```

Full raw-core access requires both:

```text
REMOTE_LINK_MODE=full
REMOTE_LINK_ALLOW_CORE_CALL=1
```

This is intentionally inconvenient. A generic raw call can reach any tool the execution backend exposes.

## Connect through OpenAI Secure MCP Tunnel

Secure MCP Tunnel is useful for the PoC because the local MCP server can stay private. The tunnel client runs on the same computer, opens an outbound HTTPS connection to OpenAI, and launches Remote Link as a local stdio MCP command.

After creating a tunnel in OpenAI Platform tunnel settings and installing `tunnel-client`, initialize a profile from this repository.

```bash
export CONTROL_PLANE_API_KEY="sk-..."

tunnel-client init \
  --sample sample_mcp_stdio_local \
  --profile remote-link-local \
  --tunnel-id YOUR_TUNNEL_ID \
  --mcp-command "pnpm start"

tunnel-client doctor --profile remote-link-local --explain
tunnel-client run --profile remote-link-local
```

On PowerShell set `CONTROL_PLANE_API_KEY` with:

```powershell
$env:CONTROL_PLANE_API_KEY="sk-..."
```

Then in ChatGPT Developer Mode, create a personal plugin and choose **Tunnel** as the connection type.

For the first test, keep Remote Link in safe mode and ask it to:

1. call `remote_link_status`
2. list a non-sensitive directory
3. read a harmless text file

Only after those work should you restart the tunnel in developer mode.

## Why not expose Desktop Commander directly?

For a local experiment, you can. Remote Link exists because the intended product needs a layer that Desktop Commander local does not provide:

- explicit Safe / Developer / Full permission profiles
- device identity and pairing
- remote transport independent of any one AI vendor
- per-device access policy
- audit and approval boundaries
- future Cloudflare-hosted relay for public remote MCP use

The OpenAI tunnel is a development transport, not the eventual public architecture.

## Planned architecture

```text
                         +------------------+
ChatGPT / Claude / Codex |   MCP clients    |
                         +--------+---------+
                                  |
                            HTTPS / MCP
                                  |
                         +--------v---------+
                         | Remote Link Edge |
                         | Cloudflare       |
                         +--------+---------+
                                  |
                         outbound encrypted
                                  |
                         +--------v---------+
                         | Local Agent      |
                         | Win / macOS/Linux|
                         +--------+---------+
                                  |
                           local MCP/stdin
                                  |
                         +--------v---------+
                         | Execution Core   |
                         | Desktop Commander|
                         +------------------+
```

## Security

Remote computer control is high impact.

Remote Link starts read-oriented and keeps mutation tools out of the MCP tool list unless developer mode is explicitly enabled. This is only a first boundary; it is **not a sandbox**.

Before a public release the project should add:

- directory-scoped permissions enforced outside the shell
- credential/sensitive-path deny rules
- command policy and approval gates
- device-bound credentials
- replay protection
- short-lived sessions
- encrypted transport
- auditable tool invocations with secret redaction
- optional container / sandbox execution

Do not treat Desktop Commander's `allowedDirectories` or command blocklist as a complete security boundary when terminal execution is enabled.

## Upstream

Remote Link interoperates with [Desktop Commander MCP](https://github.com/wonderwhy-er/DesktopCommanderMCP), which is MIT licensed. Remote Link is an independent project and is not affiliated with Desktop Commander.

## License

MIT
