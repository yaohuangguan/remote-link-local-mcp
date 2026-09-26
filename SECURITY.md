# Security

Remote Arc Local MCP connects an AI system to a real computer. Treat Full mode as privileged remote execution.

## Current model

**Safe** is the default and advertises read-oriented tools only.

**Developer** adds file mutation plus Local Undo. It does not add arbitrary terminal execution.

**Full** additionally exposes `start_process`, protected by a narrow local Safety Guard for clearly catastrophic command patterns.

There is no raw generic pass-through to arbitrary Desktop Commander tools.

## Local Undo

Before supported `write_file` and `edit_block` operations, the previous file state is stored under:

```text
~/.remotearc/local-mcp/undo
```

Snapshots never need to leave the device. Undo verifies the post-edit file hash before restoring. If the file was changed again after the Remote Arc edit, automatic undo refuses to overwrite the newer work.

Local Undo does not reverse external side effects such as deployments, package publishing, HTTP requests, cloud API calls or remote database mutations.

## Safety Guard

Full mode checks terminal commands locally before forwarding them to the execution core. It blocks a narrow set of disaster-class patterns, including:

- recursive deletion of root/home paths
- disk formatting and raw-disk overwrite
- fork bombs
- machine shutdown/reboot

It deliberately does not prompt for ordinary development commands.

The Safety Guard is defense in depth, **not a shell sandbox or complete command-policy engine**.

## Trust boundaries

1. **MCP client** — chooses which advertised tool to invoke.
2. **Remote Arc Local MCP** — defines modes, tool exposure, Undo and Safety Guard.
3. **Desktop Commander OSS** — performs local execution with the permissions of the OS user.

Once Full mode is enabled, the terminal can often access resources outside any file-tool allowlist.

## Sensitive data

Do not assume a local read tool is harmless merely because it does not modify files. Reading SSH keys, browser profiles, cloud credentials, environment files or private documents can still disclose secrets to the connected AI provider.

Future hardening should include optional sensitive-path deny rules and directory-scoped policies enforced outside the shell.

## Dependency security

Desktop Commander is pinned as a normal dependency instead of launched through an unbounded `@latest` spec. The repository uses a committed pnpm lockfile and automated dependency update checks.

Upstream updates should not be merged unless typecheck and permission-surface smoke tests pass.

## Reporting vulnerabilities

Use a private security-reporting channel when available. Do not publish working exploits, credentials or private machine data in a public issue.
