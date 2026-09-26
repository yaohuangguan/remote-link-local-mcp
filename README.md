# Remote Arc Local MCP

> Repository name is kept as `remote-link-local-mcp` for continuity. The component now follows the Remote Arc product model.

Remote Arc Local MCP is a standalone, auditable local execution layer for Remote Arc. It exposes a deliberately small MCP tool surface and delegates filesystem/process execution to a pinned Desktop Commander OSS backend.

This repository is **not currently a runtime dependency of the hosted Remote Arc CLI**. The hosted CLI embeds an equivalent bridge directly, so this project must be kept behaviorally aligned rather than assuming changes flow automatically between repositories.

## Architecture

```text
MCP client
   |
   v
Remote Arc Local MCP
   |
   | curated tools + local safety policy
   v
Desktop Commander OSS 0.2.51
   |
   +-- filesystem
   +-- processes
   +-- terminal
```

The upstream execution core is installed as a normal dependency and pinned in the lockfile. It is not launched from an unbounded `@latest` spec.

## Permission model

### Safe · default

- `remote_arc_status`
- `list_directory`
- `read_file`
- `get_file_info`
- `list_processes`
- `core_list_tools`

No file mutation or terminal execution is advertised.

### Developer

Adds:

- `write_file`
- `edit_block`
- `undo_last_change`

Developer mode intentionally **does not** include arbitrary terminal execution.

Supported file mutations create conflict-safe Local Undo snapshots under:

```text
~/.remotearc/local-mcp/undo
```

Snapshots remain on the computer, expire after 7 days, use at most 200 MB in total, and do not overwrite newer manual edits during undo.

### Full

Adds:

- `start_process`

Terminal commands pass through Remote Arc's narrow local Safety Guard. Normal development commands run without confirmation; catastrophic patterns such as root/home recursive deletion, disk formatting/raw-disk overwrite, fork bombs and machine shutdown/reboot are blocked.

This is still **not a full OS sandbox**. Full mode runs with the privileges of the local user.

## Requirements

- Node.js 20+
- pnpm 10.17.1

## Install

```bash
pnpm install --frozen-lockfile
```

## Run

Safe mode:

```bash
pnpm start
```

Developer mode:

```bash
REMOTE_ARC_MODE=developer pnpm start
```

Full mode:

```bash
REMOTE_ARC_MODE=full pnpm start
```

Legacy `REMOTE_LINK_*` environment variables are still accepted for compatibility.

## Inspect

```bash
pnpm inspect
```

## Validate

```bash
pnpm typecheck
pnpm test:smoke
```

The smoke test verifies the advertised tool surface in Safe, Developer and Full modes without executing mutation or terminal tools.

## Why keep this repository?

Remote Arc production currently carries an equivalent execution bridge inside its CLI for a one-command install experience. This repository remains useful as:

- a small auditable reference implementation of the local trust boundary
- a compatibility testbed for MCP SDK and Desktop Commander upgrades
- a place to validate security policy independently of cloud/relay code
- a future candidate for extraction into a shared package if maintaining two implementations becomes costly

If the standalone component stops providing independent value, consolidating it into the Remote Arc monorepo is preferable to allowing the two implementations to drift.

## Dependency policy

Dependencies are pinned through `pnpm-lock.yaml`, and Dependabot checks npm and GitHub Actions updates weekly.

Important upstreams currently include:

- `@modelcontextprotocol/client/server` 2.1.x
- `@wonderwhy-er/desktop-commander` 0.2.51
- Zod 4.6.x
- TypeScript 6.0.x

Upgrades should pass both typecheck and the permission-surface smoke test before merging.

## Security

Remote computer access is high impact. See [SECURITY.md](./SECURITY.md).

The core rules are:

- read-only by default
- no raw generic execution-core pass-through
- file editing separated from terminal access
- local-only, conflict-safe Undo for supported file writes
- narrow catastrophic-command Safety Guard in Full mode
- no claim that these controls form a complete sandbox

## Upstream

This project interoperates with [Desktop Commander MCP](https://github.com/wonderwhy-er/DesktopCommanderMCP), which is MIT licensed. Remote Arc is independent and is not affiliated with Desktop Commander.

## License

MIT
