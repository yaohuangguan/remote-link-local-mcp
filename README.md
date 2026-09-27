# Archived: Remote Arc Local MCP moved into the Remote Arc monorepo

This repository is no longer the active implementation.

The useful parts of this project have been migrated into **Remote Arc**:

- native local execution: `packages/execution-core`
- MCP stdio adapter: `apps/mcp`
- device agent: `apps/agent`
- one-command client: `packages/cli`

The current implementation no longer depends on Desktop Commander or another
computer-control MCP server. Remote Arc uses the open MCP protocol for
interoperability and owns its filesystem, process, terminal, Local Undo, and
Safety Guard implementation directly.

Active development:

https://github.com/yaohuangguan/remote-arc

This repository is kept only as historical context. Do not build new
integrations against it.
