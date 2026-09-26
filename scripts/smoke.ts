import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

async function inspectMode(mode: "safe" | "developer" | "full") {
  const client = new Client({
    name: "remote-arc-local-mcp-smoke",
    version: "0.2.0",
  });

  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["tsx", "src/index.ts"],
    env: {
      ...process.env,
      REMOTE_ARC_MODE: mode,
    },
    stderr: "inherit",
  });

  await client.connect(transport);

  try {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));

    if (!names.has("remote_arc_status")) {
      throw new Error(mode + ": remote_arc_status was not advertised");
    }

    const shouldEdit = mode !== "safe";
    const shouldTerminal = mode === "full";

    for (const tool of ["write_file", "edit_block", "undo_last_change"]) {
      if (names.has(tool) !== shouldEdit) {
        throw new Error(mode + ": unexpected " + tool + " exposure");
      }
    }

    if (names.has("start_process") !== shouldTerminal) {
      throw new Error(mode + ": unexpected start_process exposure");
    }

    const result = await client.callTool({
      name: "remote_arc_status",
      arguments: {},
    });
    const textBlock = result.content?.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error(mode + ": status returned no text");
    }

    const status = JSON.parse(textBlock.text) as {
      name?: string;
      mode?: string;
    };
    if (status.name !== "remote-arc-local-mcp" || status.mode !== mode) {
      throw new Error(mode + ": unexpected status " + JSON.stringify(status));
    }

    if (mode === "safe") {
      const core = await client.callTool({
        name: "core_list_tools",
        arguments: {},
      });
      if (core.isError) {
        throw new Error("safe: execution core failed to start");
      }
      const coreText = core.content?.find((block) => block.type === "text");
      if (!coreText || coreText.type !== "text") {
        throw new Error("safe: execution core returned no tool list");
      }
      const coreTools = JSON.parse(coreText.text) as Array<{ name?: string }>;
      const coreNames = new Set(coreTools.map((tool) => tool.name));
      for (const required of ["read_file", "start_process", "write_file"]) {
        if (!coreNames.has(required)) {
          throw new Error("safe: pinned execution core missing " + required);
        }
      }
    }

    return names.size;
  } finally {
    await client.close();
  }
}

const safe = await inspectMode("safe");
const developer = await inspectMode("developer");
const full = await inspectMode("full");

process.stdout.write(
  `Remote Arc Local MCP smoke passed · safe=${safe} developer=${developer} full=${full}\n`,
);
