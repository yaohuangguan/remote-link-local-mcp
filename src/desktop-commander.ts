import process from "node:process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { config } from "./config.js";

class DesktopCommanderBridge {
  private client: Client | null = null;
  private connecting: Promise<Client> | null = null;

  private async connect(): Promise<Client> {
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const client = new Client({
        name: "remote-arc-local-core-client",
        version: "0.2.0",
      });

      const desktopCommanderEntry = fileURLToPath(
        import.meta.resolve("@wonderwhy-er/desktop-commander/dist/index.js"),
      );
      const transport = new StdioClientTransport(
        config.desktopCommanderCommand
          ? {
              command: config.desktopCommanderCommand,
              args: ["-y", config.desktopCommanderPackage],
              stderr: "inherit",
            }
          : {
              command: process.execPath,
              args: [desktopCommanderEntry],
              stderr: "inherit",
            },
      );

      await client.connect(transport);
      this.client = client;
      return client;
    })();

    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async listTools() {
    const client = await this.connect();
    return client.listTools();
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    const client = await this.connect();
    return client.callTool({ name, arguments: args });
  }

  async close() {
    if (!this.client) return;
    await this.client.close();
    this.client = null;
  }
}

export const desktopCommander = new DesktopCommanderBridge();
