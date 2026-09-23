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
        name: "remote-link-core-client",
        version: "0.1.0",
      });

      const transport = new StdioClientTransport({
        command: config.desktopCommanderCommand,
        args: ["-y", config.desktopCommanderPackage],
        stderr: "pipe",
      });

      transport.stderr?.on("data", (chunk) => {
        process.stderr.write(`[desktop-commander] ${chunk}`);
      });

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
