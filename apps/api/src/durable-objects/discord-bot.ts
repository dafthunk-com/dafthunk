/**
 * DiscordBot Durable Object
 *
 * Maintains a persistent WebSocket connection to the Discord Gateway,
 * listening for MESSAGE_CREATE events and dispatching workflow executions.
 * One DO instance per bot+guild pair. The bot token is provided via the
 * /connect endpoint and persisted in DO SQLite for reconnection.
 */

import { DurableObject } from "cloudflare:workers";
import type { Workflow, WorkflowTrigger } from "@dafthunk/types";

import type { Bindings } from "../context";
import {
  createDatabase,
  getDiscordTriggersByGuild,
  getOrganizationComputeCredits,
} from "../db";
import { createWorkerRuntime } from "../runtime/cloudflare-worker-runtime";
import { DeploymentStore } from "../stores/deployment-store";
import { WorkflowStore } from "../stores/workflow-store";

// Discord Gateway opcodes
const GatewayOpcode = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

// Discord intents: GUILDS (1) | GUILD_MESSAGES (512) | MESSAGE_CONTENT (32768) = 33281
const GATEWAY_INTENTS = 33281;

const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";

export class DiscordBot extends DurableObject<Bindings> {
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatAcked = true;
  private guildId: string | null = null;
  private sessionId: string | null = null;
  private seq: number | null = null;
  private resumeGatewayUrl: string | null = null;

  private storedBotToken: string | null = null;
  private discordBotId: string | null = null;

  private get botToken(): string | undefined {
    return this.storedBotToken ?? undefined;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/connect") {
      return this.handleConnect(request);
    }
    if (request.method === "POST" && url.pathname === "/disconnect") {
      return this.handleDisconnect();
    }
    if (request.method === "GET" && url.pathname === "/status") {
      return this.handleStatus();
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleConnect(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      guildId: string;
      botToken?: string;
      discordBotId?: string;
    };
    this.guildId = body.guildId;
    if (body.botToken) {
      this.storedBotToken = body.botToken;
    }
    if (body.discordBotId) {
      this.discordBotId = body.discordBotId;
    }

    if (!this.botToken) {
      return new Response(JSON.stringify({ error: "No bot token provided" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Persist guild in DO SQLite
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS gateway_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        session_id TEXT,
        seq INTEGER,
        resume_gateway_url TEXT,
        guild_id TEXT NOT NULL,
        bot_token TEXT,
        discord_bot_id TEXT
      )`
    );

    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO gateway_state (id, guild_id, bot_token, discord_bot_id, session_id, seq, resume_gateway_url)
       VALUES (1, ?, ?, ?, NULL, NULL, NULL)`,
      this.guildId,
      this.storedBotToken,
      this.discordBotId
    );

    // Attempt to restore session state for resume
    this.loadPersistedState();

    // Close existing connection if any
    this.closeWebSocket();

    // Connect to Discord Gateway
    await this.connectToGateway();

    // Arm reconnection alarm
    await this.ctx.storage.setAlarm(Date.now() + 60_000);

    return new Response(JSON.stringify({ status: "connecting" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleDisconnect(): Promise<Response> {
    this.closeWebSocket();
    this.clearHeartbeat();
    await this.ctx.storage.deleteAlarm();

    // Clear persisted state
    this.ctx.storage.sql.exec("DELETE FROM gateway_state WHERE id = 1");

    this.guildId = null;
    this.storedBotToken = null;
    this.discordBotId = null;
    this.sessionId = null;
    this.seq = null;
    this.resumeGatewayUrl = null;

    return new Response(JSON.stringify({ status: "disconnected" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private handleStatus(): Response {
    const connected = this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    return new Response(
      JSON.stringify({
        connected,
        guildId: this.guildId,
        sessionId: this.sessionId,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  async alarm(): Promise<void> {
    if (!this.guildId) {
      this.loadPersistedState();
      if (!this.guildId) return;
    }

    if (!this.botToken) return;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log(
        `[DiscordBot] Alarm: WebSocket not open for guild ${this.guildId}, reconnecting`
      );
      await this.connectToGateway();
    }

    // Re-arm alarm
    await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }

  private loadPersistedState(): void {
    try {
      const rows = this.ctx.storage.sql
        .exec("SELECT * FROM gateway_state WHERE id = 1")
        .toArray();
      if (rows.length > 0) {
        const row = rows[0] as Record<string, unknown>;
        this.guildId = row.guild_id as string;
        this.storedBotToken = (row.bot_token as string) || null;
        this.discordBotId = (row.discord_bot_id as string) || null;
        this.sessionId = (row.session_id as string) || null;
        this.seq = (row.seq as number) ?? null;
        this.resumeGatewayUrl = (row.resume_gateway_url as string) || null;
      }
    } catch {
      // Table may not exist yet
    }
  }

  private persistSessionState(): void {
    try {
      this.ctx.storage.sql.exec(
        `UPDATE gateway_state SET session_id = ?, seq = ?, resume_gateway_url = ? WHERE id = 1`,
        this.sessionId,
        this.seq,
        this.resumeGatewayUrl
      );
    } catch {
      // Ignore if table doesn't exist
    }
  }

  private async connectToGateway(): Promise<void> {
    if (!this.botToken) return;

    const gatewayUrl =
      this.resumeGatewayUrl && this.sessionId
        ? `${this.resumeGatewayUrl}/?v=10&encoding=json`
        : GATEWAY_URL;

    const resp = await fetch(gatewayUrl, {
      headers: { Upgrade: "websocket" },
    });

    const ws = resp.webSocket;
    if (!ws) {
      console.error("[DiscordBot] Failed to establish WebSocket connection");
      return;
    }

    ws.accept();
    this.ws = ws;

    ws.addEventListener("message", (event) => {
      this.handleGatewayMessage(
        typeof event.data === "string"
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer)
      );
    });

    ws.addEventListener("close", (event) => {
      console.log(
        `[DiscordBot] WebSocket closed: code=${event.code} reason=${event.reason}`
      );
      this.ws = null;
      this.clearHeartbeat();
    });

    ws.addEventListener("error", (event) => {
      console.error("[DiscordBot] WebSocket error:", event);
    });
  }

  private handleGatewayMessage(raw: string): void {
    const data = JSON.parse(raw);
    const op: number = data.op;
    const t: string | null = data.t;
    const s: number | null = data.s;
    const d = data.d;

    // Update sequence number
    if (s !== null) {
      this.seq = s;
      this.persistSessionState();
    }

    switch (op) {
      case GatewayOpcode.HELLO:
        this.startHeartbeat(d.heartbeat_interval);
        if (this.sessionId && this.seq !== null) {
          this.sendResume();
        } else {
          this.sendIdentify();
        }
        break;

      case GatewayOpcode.HEARTBEAT:
        this.sendHeartbeat();
        break;

      case GatewayOpcode.HEARTBEAT_ACK:
        this.heartbeatAcked = true;
        break;

      case GatewayOpcode.DISPATCH:
        this.handleDispatch(t, d);
        break;

      case GatewayOpcode.RECONNECT:
        console.log("[DiscordBot] Received RECONNECT, reconnecting...");
        this.closeWebSocket();
        this.connectToGateway();
        break;

      case GatewayOpcode.INVALID_SESSION:
        console.log(`[DiscordBot] Invalid session, resumable=${d}`);
        if (d === true) {
          setTimeout(() => this.sendResume(), 1000 + Math.random() * 4000);
        } else {
          this.sessionId = null;
          this.seq = null;
          this.persistSessionState();
          setTimeout(() => this.sendIdentify(), 1000 + Math.random() * 4000);
        }
        break;
    }
  }

  private handleDispatch(
    eventName: string | null,
    d: Record<string, unknown>
  ): void {
    if (eventName === "READY") {
      this.sessionId = d.session_id as string;
      this.resumeGatewayUrl = d.resume_gateway_url as string;
      this.persistSessionState();
      console.log(
        `[DiscordBot] Connected as session ${this.sessionId} for guild ${this.guildId}`
      );
      return;
    }

    if (eventName === "RESUMED") {
      console.log("[DiscordBot] Session resumed successfully");
      return;
    }

    if (eventName === "MESSAGE_CREATE") {
      this.handleMessageCreate(d);
    }
  }

  private handleMessageCreate(d: Record<string, unknown>): void {
    const author = d.author as Record<string, unknown> | undefined;
    if (!author) return;

    // Skip bot messages
    if (author.bot === true) return;

    const guildId = d.guild_id as string | undefined;
    if (!guildId) return; // DM — ignore

    const channelId = d.channel_id as string;
    const messageId = d.id as string;
    const content = (d.content as string) || "";
    const timestamp = d.timestamp as string;

    this.ctx.waitUntil(
      this.dispatchWorkflows({
        guildId,
        channelId,
        messageId,
        content,
        author: {
          id: author.id as string,
          username: author.username as string,
          bot: false,
        },
        timestamp,
      })
    );
  }

  private async dispatchWorkflows(message: {
    guildId: string;
    channelId: string;
    messageId: string;
    content: string;
    author: { id: string; username: string; bot: boolean };
    timestamp: string;
  }): Promise<void> {
    const db = createDatabase(this.env.DB);

    const allTriggers = await getDiscordTriggersByGuild(db, message.guildId);
    // Only dispatch triggers that belong to this DO's bot
    const triggers = allTriggers.filter(
      (t) => t.discordTrigger.discordBotId === this.discordBotId
    );
    if (triggers.length === 0) return;

    const workflowStore = new WorkflowStore(this.env);
    const deploymentStore = new DeploymentStore(this.env);

    for (const { discordTrigger, workflow } of triggers) {
      if (
        discordTrigger.channelId &&
        discordTrigger.channelId !== message.channelId
      ) {
        continue;
      }

      try {
        await this.executeWorkflow(
          workflow,
          message,
          workflowStore,
          deploymentStore
        );
      } catch (error) {
        console.error(
          `[DiscordBot] Failed to trigger workflow ${workflow.id}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  private async executeWorkflow(
    workflow: {
      id: string;
      name: string;
      handle: string;
      trigger: string;
      organizationId: string;
      activeDeploymentId: string | null;
    },
    message: {
      guildId: string;
      channelId: string;
      messageId: string;
      content: string;
      author: { id: string; username: string; bot: boolean };
      timestamp: string;
    },
    workflowStore: WorkflowStore,
    deploymentStore: DeploymentStore
  ): Promise<void> {
    const db = createDatabase(this.env.DB);
    const organizationId = workflow.organizationId;

    let workflowData: Workflow;
    let deploymentId: string | undefined;

    if (workflow.activeDeploymentId) {
      try {
        workflowData = await deploymentStore.readWorkflowSnapshot(
          workflow.activeDeploymentId
        );
        deploymentId = workflow.activeDeploymentId;
      } catch (error) {
        console.error(
          `[DiscordBot] Failed to load deployment ${workflow.activeDeploymentId}:`,
          error
        );
        return;
      }
    } else {
      try {
        const workflowWithData = await workflowStore.getWithData(
          workflow.id,
          organizationId
        );
        if (!workflowWithData?.data) {
          console.error(
            `[DiscordBot] Failed to load workflow data for ${workflow.id}`
          );
          return;
        }
        workflowData = workflowWithData.data;
      } catch (error) {
        console.error(
          `[DiscordBot] Failed to load workflow ${workflow.id}:`,
          error
        );
        return;
      }
    }

    if (!workflowData.nodes || workflowData.nodes.length === 0) {
      console.error(
        `[DiscordBot] Workflow ${workflow.id} has no nodes, skipping`
      );
      return;
    }

    const computeCredits = await getOrganizationComputeCredits(
      db,
      organizationId
    );
    if (computeCredits === undefined) {
      console.error("[DiscordBot] Organization not found");
      return;
    }

    const executionParams = {
      userId: "discord_trigger",
      organizationId,
      computeCredits,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        trigger: workflow.trigger as WorkflowTrigger,
        runtime: workflowData.runtime,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      deploymentId,
      discordMessage: message,
      ...(this.storedBotToken ? { discordBotToken: this.storedBotToken } : {}),
    };

    if (workflowData.runtime === "worker") {
      const workerRuntime = createWorkerRuntime(this.env);
      const execution = await workerRuntime.execute(executionParams);
      console.log(
        `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=discord`
      );
    } else {
      const executionInstance = await this.env.EXECUTE.create({
        params: executionParams,
      });
      console.log(
        `[Execution] ${executionInstance.id} workflow=${workflow.id} runtime=workflow trigger=discord`
      );
    }
  }

  private sendIdentify(): void {
    if (!this.ws || !this.botToken) return;
    this.ws.send(
      JSON.stringify({
        op: GatewayOpcode.IDENTIFY,
        d: {
          token: this.botToken,
          intents: GATEWAY_INTENTS,
          properties: {
            os: "cloudflare",
            browser: "dafthunk",
            device: "dafthunk",
          },
        },
      })
    );
  }

  private sendResume(): void {
    if (!this.ws || !this.botToken || !this.sessionId) return;
    this.ws.send(
      JSON.stringify({
        op: GatewayOpcode.RESUME,
        d: {
          token: this.botToken,
          session_id: this.sessionId,
          seq: this.seq,
        },
      })
    );
  }

  private sendHeartbeat(): void {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        op: GatewayOpcode.HEARTBEAT,
        d: this.seq,
      })
    );
  }

  private startHeartbeat(intervalMs: number): void {
    this.clearHeartbeat();
    this.heartbeatAcked = true;

    const jitter = Math.random() * intervalMs;
    setTimeout(() => {
      this.sendHeartbeat();

      this.heartbeatInterval = setInterval(() => {
        if (!this.heartbeatAcked) {
          console.log("[DiscordBot] Heartbeat not acked, reconnecting...");
          this.closeWebSocket();
          this.connectToGateway();
          return;
        }
        this.heartbeatAcked = false;
        this.sendHeartbeat();
      }, intervalMs);
    }, jitter);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private closeWebSocket(): void {
    if (this.ws) {
      try {
        this.ws.close(1000, "Client disconnect");
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.clearHeartbeat();
  }
}
