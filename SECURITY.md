# Security

Remote Link connects AI systems to a real computer. Treat it as privileged remote-execution software.

## Current security model

Remote Link starts in `safe` mode and only advertises read-oriented tools.

Mutation and terminal tools are not merely hidden in documentation; they are not registered with the MCP server unless `REMOTE_LINK_MODE=developer` or `full` is set.

`full` mode still does not expose the generic upstream pass-through unless:

```text
REMOTE_LINK_MODE=full
REMOTE_LINK_ALLOW_CORE_CALL=1
```

This reduces accidental capability exposure, but it is **not a sandbox**.

## Trust boundaries

The current PoC has three distinct trust boundaries:

1. **AI client / MCP host** — may decide when and how to invoke advertised tools.
2. **Remote Link** — defines which capabilities are exposed.
3. **Desktop Commander OSS execution core** — performs local filesystem, process, and terminal operations using the permissions of the local user.

Once terminal execution is enabled, path allowlists alone must not be treated as a complete security boundary. A shell command can often access resources outside a file-tool allowlist.

## Do not use the current PoC for

- unattended access to a sensitive workstation
- multi-user hosting
- exposing a raw MCP endpoint directly to the public internet
- machines containing credentials you cannot afford to disclose
- production infrastructure

## Required before a public remote release

The remote product architecture should add, at minimum:

- device-bound credentials
- short-lived authenticated sessions
- replay protection
- explicit per-device capability policy
- path rules enforced outside the shell
- sensitive-path defaults for SSH keys, browser profiles, cloud credentials, and environment files
- command classification and approval gates
- secret redaction in logs
- an auditable invocation trail
- rate limiting
- encrypted transport
- session revocation
- optional sandbox/container execution

## Reporting vulnerabilities

Until a dedicated security contact is published, please open a GitHub issue only for non-sensitive security design discussions.

Do **not** publish working exploits, credentials, private machine data, or other sensitive vulnerability details in a public issue.
