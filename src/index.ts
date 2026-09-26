import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { canEditFiles, canUseTerminal, config } from "./config.js";
import { desktopCommander } from "./desktop-commander.js";
import {
  assertCommandAllowed,
  createUndoSnapshot,
  discardUndoSnapshot,
  finalizeUndoSnapshot,
  undoLastChange,
} from "./local-safety.js";

const server = new McpServer({
  name: "remote-arc-local-mcp",
  version: "0.2.0",
});

const errorResult = (error: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: error instanceof Error ? error.message : String(error),
    },
  ],
  isError: true,
});

const callCore = async (
  name: string,
  args: Record<string, unknown> = {},
) => {
  try {
    return await desktopCommander.callTool(name, args);
  } catch (error) {
    return errorResult(error);
  }
};

const callReversibleCore = async (
  tool: "write_file" | "edit_block",
  args: Record<string, unknown>,
) => {
  let snapshot = null;
  try {
    snapshot = await createUndoSnapshot(tool, args);
    const result = await desktopCommander.callTool(tool, args);
    if ((result as { isError?: boolean }).isError) {
      await discardUndoSnapshot(snapshot);
      return result;
    }
    await finalizeUndoSnapshot(snapshot);
    return result;
  } catch (error) {
    await discardUndoSnapshot(snapshot);
    return errorResult(error);
  }
};

server.registerTool(
  "remote_arc_status",
  {
    title: "Remote Arc local status",
    description:
      "Show the active Remote Arc permission mode and local execution backend.",
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            name: "remote-arc-local-mcp",
            version: "0.2.0",
            mode: config.mode,
            backend: "Desktop Commander OSS 0.2.51 over local stdio",
            fileEditing: canEditFiles(),
            terminal: canUseTerminal(),
            localUndo: canEditFiles(),
            safetyGuard: canUseTerminal(),
          },
          null,
          2,
        ),
      },
    ],
  }),
);

server.registerTool(
  "list_directory",
  {
    title: "List local directory",
    description:
      "List files and directories on the connected computer through the Desktop Commander execution core.",
    inputSchema: z.object({
      path: z.string(),
      depth: z.number().int().min(1).max(10).default(2),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async ({ path, depth }) => callCore("list_directory", { path, depth }),
);

server.registerTool(
  "read_file",
  {
    title: "Read local file",
    description:
      "Read a local file through the Desktop Commander execution core.",
    inputSchema: z.object({
      path: z.string(),
      offset: z.number().int().optional(),
      length: z.number().int().positive().optional(),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async ({ path, offset, length }) =>
    callCore("read_file", {
      path,
      ...(offset !== undefined ? { offset } : {}),
      ...(length !== undefined ? { length } : {}),
    }),
);

server.registerTool(
  "get_file_info",
  {
    title: "Get local file info",
    description: "Get metadata about a local file or directory.",
    inputSchema: z.object({ path: z.string() }),
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async ({ path }) => callCore("get_file_info", { path }),
);

server.registerTool(
  "list_processes",
  {
    title: "List local processes",
    description: "List processes running on the connected computer.",
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async () => callCore("list_processes"),
);

server.registerTool(
  "core_list_tools",
  {
    title: "Inspect execution-core tools",
    description:
      "List tools exposed by the pinned Desktop Commander execution core for compatibility diagnostics.",
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async () => {
    try {
      const result = await desktopCommander.listTools();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.tools, null, 2),
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  },
);

if (canEditFiles()) {
  server.registerTool(
    "write_file",
    {
      title: "Write local file",
      description:
        "Write content to a local file. A conflict-safe Local Undo snapshot is kept only on this computer.",
      inputSchema: z.object({
        path: z.string(),
        content: z.string(),
        mode: z.enum(["rewrite", "append"]).default("rewrite"),
      }),
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
    },
    async ({ path, content, mode }) =>
      callReversibleCore("write_file", { path, content, mode }),
  );

  server.registerTool(
    "edit_block",
    {
      title: "Edit local text",
      description:
        "Apply a targeted search-and-replace edit. A conflict-safe Local Undo snapshot stays on this computer.",
      inputSchema: z.object({
        file_path: z.string(),
        old_string: z.string(),
        new_string: z.string(),
        expected_replacements: z.number().int().positive().default(1),
      }),
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
    },
    async ({ file_path, old_string, new_string, expected_replacements }) =>
      callReversibleCore("edit_block", {
        file_path,
        old_string,
        new_string,
        expected_replacements,
      }),
  );

  server.registerTool(
    "undo_last_change",
    {
      title: "Undo the last Remote Arc file change",
      description:
        "Restore the latest reversible file change from a local-only snapshot. Refuses to overwrite newer manual edits.",
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
    },
    async () => {
      try {
        const result = await undoLastChange();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

if (canUseTerminal()) {
  server.registerTool(
    "start_process",
    {
      title: "Start local process",
      description:
        "Run a terminal command. A narrow local Safety Guard blocks catastrophic system commands without prompting for normal development work.",
      inputSchema: z.object({
        command: z.string(),
        timeout_ms: z.number().int().positive().default(5000),
      }),
      annotations: { readOnlyHint: false, openWorldHint: true, destructiveHint: true },
    },
    async ({ command, timeout_ms }) => {
      try {
        assertCommandAllowed(command);
        return await desktopCommander.callTool("start_process", {
          command,
          timeout_ms,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

const transport = new StdioServerTransport();

const shutdown = async () => {
  await desktopCommander.close().catch(() => undefined);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await server.connect(transport);
process.stderr.write(
  `Remote Arc Local MCP started in ${config.mode} mode (stdio)\n`,
);
