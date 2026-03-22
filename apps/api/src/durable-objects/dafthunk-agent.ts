import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicConfig } from "@dafthunk/runtime/utils/ai-gateway";
import type {
  AssistantMessage,
  AssistantClientMessage,
  AssistantServerMessage,
  ToolStep,
} from "@dafthunk/types";
import { Agent } from "agents";
import type { Connection } from "partyserver";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "../context";
import {
  createDatabase,
  getDatabases,
  getDatasets,
  getDiscordBots,
  getEmails,
  getEndpoints,
  getIntegrations,
  getQueues,
  getSecrets,
  getTelegramBots,
  getWhatsAppAccounts,
} from "../db";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";
import { WorkflowStore } from "../stores/workflow-store";
import { workflowTemplates } from "../templates";

const MODEL = "claude-opus-4-20250514";

interface UserProfile {
  expertiseLevel?: "beginner" | "intermediate" | "advanced";
  preferredTone?: "casual" | "professional" | "technical";
  domain?: string;
}

export interface AssistantAgentState {
  organizationId: string;
  userId: string;
  activeConversationId: string;
  userProfile: UserProfile;
}

const TOOLS: Anthropic.Tool[] = [
  // ── Discovery tools ───────────────────────────────────────────────
  {
    name: "getOrgState",
    description:
      "Get org state: integrations, secrets, workflows, endpoints, emails, queues, datasets, databases.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "listTemplates",
    description: "List available workflow templates. Optionally filter by tag.",
    input_schema: {
      type: "object" as const,
      properties: {
        tag: { type: "string", description: "Filter by tag" },
      },
      required: [],
    },
  },
  {
    name: "checkTemplateRequirements",
    description: "Check if the org has integrations needed for a template.",
    input_schema: {
      type: "object" as const,
      properties: {
        templateId: { type: "string", description: "Template ID" },
      },
      required: ["templateId"],
    },
  },
  {
    name: "listResources",
    description:
      "List resources of a specific type in the organization. Returns id, name, and type-specific fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        resourceType: {
          type: "string",
          enum: [
            "workflows",
            "endpoints",
            "emails",
            "queues",
            "datasets",
            "databases",
            "integrations",
            "secrets",
            "discord-bots",
            "telegram-bots",
            "whatsapp-accounts",
          ],
          description: "Type of resource to list",
        },
      },
      required: ["resourceType"],
    },
  },
  {
    name: "navigateUser",
    description:
      "Navigate the user's browser to a specific page in the app. Use this instead of giving URLs.",
    input_schema: {
      type: "object" as const,
      properties: {
        page: {
          type: "string",
          enum: [
            "workflows",
            "endpoints",
            "emails",
            "queues",
            "datasets",
            "databases",
            "integrations",
            "secrets",
            "bots",
            "templates",
            "playground",
          ],
          description: "Page to navigate to",
        },
        resourceId: {
          type: "string",
          description:
            "Optional resource ID for detail pages (e.g. a specific workflow)",
        },
      },
      required: ["page"],
    },
  },
  // ── Node & workflow reading tools ────────────────────────────────
  {
    name: "searchNodes",
    description:
      "Search the node library by keyword. Returns matching node types with descriptions, inputs, and outputs.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search keyword (matches name, description, tags)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getWorkflow",
    description:
      "Read a workflow's full definition: nodes, edges, trigger, and metadata.",
    input_schema: {
      type: "object" as const,
      properties: {
        workflowId: { type: "string", description: "Workflow ID" },
      },
      required: ["workflowId"],
    },
  },
];

const INTEGRATION_NODE_MAP: Record<string, string> = {
  "discord-send-message": "discord",
  "discord-message": "discord",
  "telegram-send-message": "telegram",
  "telegram-message": "telegram",
  "whatsapp-send-message": "whatsapp",
  "whatsapp-message": "whatsapp",
  "google-mail-send": "google-mail",
  "google-calendar-list-events": "google-calendar",
  "github-create-issue": "github",
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  getOrgState: "Checking org state...",
  listTemplates: "Browsing templates...",
  checkTemplateRequirements: "Checking requirements...",
  listResources: "Listing resources...",
  navigateUser: "Navigating...",
  searchNodes: "Searching nodes...",
  getWorkflow: "Reading workflow...",
};

export class DafthunkAgent extends Agent<Bindings, AssistantAgentState> {
  private schemaInitialized = false;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
  }

  private ensureSchema(): void {
    if (this.schemaInitialized) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
    this.schemaInitialized = true;
  }

  private createConversation(title: string): string {
    const id = uuidv7();
    const now = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      id,
      title,
      now,
      now
    );
    return id;
  }

  private getConversationMessages(
    conversationId: string
  ): AssistantMessage[] {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY id",
        conversationId
      )
      .toArray();
    return rows.map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content as string,
      timestamp: r.timestamp as number,
    }));
  }

  private addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string
  ): void {
    const now = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT INTO messages (conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
      conversationId,
      role,
      content,
      now
    );
    this.ctx.storage.sql.exec(
      "UPDATE conversations SET updated_at = ? WHERE id = ?",
      now,
      conversationId
    );
  }

  private listConversations(): {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
  }[] {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC"
      )
      .toArray();
    return rows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      createdAt: r.created_at as number,
      updatedAt: r.updated_at as number,
    }));
  }

  private generateTitle(content: string): string {
    return content.length > 50 ? `${content.slice(0, 47)}...` : content;
  }

  onConnect(connection: Connection, ctx: { request: Request }): void {
    this.ensureSchema();

    const userId = ctx.request.headers.get("X-User-Id") ?? "";
    const orgId = ctx.request.headers.get("X-Organization-Id") ?? "";

    if (!this.state) {
      const convId = this.createConversation("New conversation");
      this.setState({
        organizationId: orgId,
        userId,
        activeConversationId: convId,
        userProfile: {},
      });
    }

    const activeId = this.state!.activeConversationId;
    const messages = this.getConversationMessages(activeId);

    connection.send(
      JSON.stringify({
        type: "conversation_switched",
        conversationId: activeId,
        messages,
      } satisfies AssistantServerMessage)
    );
    connection.send(
      JSON.stringify({
        type: "conversations",
        conversations: this.listConversations(),
      } satisfies AssistantServerMessage)
    );
  }

  async onMessage(connection: Connection, message: string): Promise<void> {
    try {
      this.ensureSchema();
      const parsed = JSON.parse(message as string) as AssistantClientMessage;

      switch (parsed.type) {
        case "list_conversations": {
          connection.send(
            JSON.stringify({
              type: "conversations",
              conversations: this.listConversations(),
            } satisfies AssistantServerMessage)
          );
          return;
        }

        case "new_conversation": {
          const convId = this.createConversation("New conversation");
          this.setState({ ...this.state!, activeConversationId: convId });
          connection.send(
            JSON.stringify({
              type: "conversation_switched",
              conversationId: convId,
              messages: [],
            } satisfies AssistantServerMessage)
          );
          connection.send(
            JSON.stringify({
              type: "conversations",
              conversations: this.listConversations(),
            } satisfies AssistantServerMessage)
          );
          return;
        }

        case "switch_conversation": {
          const convId = parsed.conversationId;
          this.setState({ ...this.state!, activeConversationId: convId });
          const messages = this.getConversationMessages(convId);
          connection.send(
            JSON.stringify({
              type: "conversation_switched",
              conversationId: convId,
              messages,
            } satisfies AssistantServerMessage)
          );
          return;
        }

        case "delete_conversation": {
          const convId = parsed.conversationId;
          this.ctx.storage.sql.exec(
            "DELETE FROM messages WHERE conversation_id = ?",
            convId
          );
          this.ctx.storage.sql.exec(
            "DELETE FROM conversations WHERE id = ?",
            convId
          );

          // If we deleted the active conversation, switch to the latest or create new
          if (this.state?.activeConversationId === convId) {
            const remaining = this.listConversations();
            const newActiveId =
              remaining.length > 0
                ? remaining[0].id
                : this.createConversation("New conversation");
            this.setState({
              ...this.state!,
              activeConversationId: newActiveId,
            });
            connection.send(
              JSON.stringify({
                type: "conversation_switched",
                conversationId: newActiveId,
                messages: this.getConversationMessages(newActiveId),
              } satisfies AssistantServerMessage)
            );
          }

          connection.send(
            JSON.stringify({
              type: "conversations",
              conversations: this.listConversations(),
            } satisfies AssistantServerMessage)
          );
          return;
        }

        case "chat": {
          if (!parsed.content.trim()) return;

          const activeId = this.state!.activeConversationId;
          this.addMessage(activeId, "user", parsed.content);

          // Update title from first user message
          const allMessages = this.getConversationMessages(activeId);
          const userMessages = allMessages.filter((m) => m.role === "user");
          if (userMessages.length === 1) {
            const title = this.generateTitle(parsed.content);
            this.ctx.storage.sql.exec(
              "UPDATE conversations SET title = ? WHERE id = ?",
              title,
              activeId
            );
            connection.send(
              JSON.stringify({
                type: "conversations",
                conversations: this.listConversations(),
              } satisfies AssistantServerMessage)
            );
          }

          await this.runAgentLoop(connection, allMessages);
          return;
        }
      }
    } catch (error) {
      const errorMsg: AssistantServerMessage = {
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      };
      connection.send(JSON.stringify(errorMsg));
    }
  }

  private async runAgentLoop(
    connection: Connection,
    chatHistory: AssistantMessage[]
  ): Promise<void> {
    const client = new Anthropic({
      apiKey: "gateway-managed",
      timeout: 120_000,
      ...getAnthropicConfig(this.env),
    });

    const systemPrompt = this.buildSystemPrompt();

    const anthropicMessages: Anthropic.MessageParam[] = chatHistory.map(
      (m) => ({
        role: m.role,
        content: m.content,
      })
    );

    let continueLoop = true;
    const toolSteps: ToolStep[] = [];

    while (continueLoop) {
      const startMsg: AssistantServerMessage = { type: "stream_start" };
      connection.send(JSON.stringify(startMsg));

      let fullText = "";

      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: TOOLS,
      });

      // Track whether this turn includes tool calls. When it does,
      // suppress text streaming — that text is pre-tool reasoning and
      // should not be shown to the user.
      let hasToolUse = false;

      for await (const event of stream) {
        if (
          event.type === "content_block_start" &&
          event.content_block.type === "tool_use"
        ) {
          hasToolUse = true;
        } else if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullText += event.delta.text;
          if (!hasToolUse) {
            connection.send(
              JSON.stringify({
                type: "stream_chunk",
                content: event.delta.text,
              } satisfies AssistantServerMessage)
            );
          }
        }
      }

      const finalMessage = await stream.finalMessage();

      const toolBlocks = finalMessage.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolBlocks.length === 0) {
        if (fullText) {
          this.addMessage(
            this.state!.activeConversationId,
            "assistant",
            fullText
          );
        }

        connection.send(
          JSON.stringify({
            type: "stream_end",
          } satisfies AssistantServerMessage)
        );
        const turnComplete: AssistantServerMessage = {
          type: "turn_complete",
          content: fullText,
          toolSteps: toolSteps.length > 0 ? toolSteps : undefined,
        };
        connection.send(JSON.stringify(turnComplete));

        continueLoop = false;
      } else {
        connection.send(
          JSON.stringify({
            type: "stream_end",
          } satisfies AssistantServerMessage)
        );

        anthropicMessages.push({
          role: "assistant",
          content: finalMessage.content,
        });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolBlock of toolBlocks) {
          const description = TOOL_DESCRIPTIONS[toolBlock.name] ?? "Working...";
          toolSteps.push({ tool: toolBlock.name, description });

          const progressMsg: AssistantServerMessage = {
            type: "tool_progress",
            tool: toolBlock.name,
            description,
          };
          connection.send(JSON.stringify(progressMsg));

          const result = await this.executeTool(
            toolBlock.name,
            toolBlock.input as Record<string, unknown>,
            connection
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify(result),
          });
        }

        anthropicMessages.push({
          role: "user",
          content: toolResults,
        });
      }
    }
  }

  private buildSystemPrompt(): string {
    const profile = this.state?.userProfile ?? {};

    return `You help users set up workflows on Dafthunk, a visual workflow automation platform.

## Writing style
Every word must earn its place. Be direct, specific, and brief. No filler, no preamble, no "Great question!" or "I'd be happy to help." Just answer. Prefer short sentences. Use lists only when comparing options. One idea per message when possible.
${profile.domain ? `\nUser's domain: "${profile.domain}". Tailor examples.` : ""}
${profile.expertiseLevel ? `User expertise: ${profile.expertiseLevel}.` : ""}
${profile.preferredTone ? `Tone: ${profile.preferredTone}.` : ""}

## Triggers available
Email (@dafthunk.com), HTTP endpoints (webhook/request), cron schedule, Discord bot, Telegram bot, WhatsApp bot. No Gmail trigger.

## What you can do
- Browse: list org resources, templates, and node types.
- Navigate: use navigateUser to send the user to any page (bots, integrations, workflows, templates, etc).
- Inspect: use getWorkflow to read a workflow's definition, searchNodes to explore the node library.

## Rules
- Call getOrgState before recommending anything. Never guess what exists.
- Use navigateUser to direct users to relevant pages — never output raw URLs.
- You are read-only: you cannot create, modify, or delete any resources. Guide users to the appropriate pages instead.`;
  }

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    connection: Connection
  ): Promise<Record<string, unknown>> {
    const orgId = this.state?.organizationId ?? "";
    const db = createDatabase(this.env.DB);

    switch (name) {
      case "getOrgState": {
        const [
          orgIntegrations,
          orgSecrets,
          workflows,
          orgEndpoints,
          orgEmails,
          orgQueues,
          orgDatasets,
          orgDatabases,
          orgDiscordBots,
          orgTelegramBots,
          orgWhatsAppAccounts,
        ] = await Promise.all([
          getIntegrations(db, orgId),
          getSecrets(db, orgId),
          new WorkflowStore(this.env).list(orgId),
          getEndpoints(db, orgId),
          getEmails(db, orgId),
          getQueues(db, orgId),
          getDatasets(db, orgId),
          getDatabases(db, orgId),
          getDiscordBots(db, orgId),
          getTelegramBots(db, orgId),
          getWhatsAppAccounts(db, orgId),
        ]);

        return {
          integrations: orgIntegrations.map((i) => ({
            id: i.id,
            name: i.name,
            provider: i.provider,
            status: i.status,
          })),
          secrets: orgSecrets.map((s) => ({ id: s.id, name: s.name })),
          workflows: workflows.map((w) => ({
            id: w.id,
            name: w.name,
            trigger: w.trigger,
          })),
          endpoints: orgEndpoints.map((e) => ({
            id: e.id,
            name: e.name,
            mode: e.mode,
          })),
          emails: orgEmails.map((e) => ({ id: e.id, name: e.name })),
          queues: orgQueues.map((q) => ({ id: q.id, name: q.name })),
          datasets: orgDatasets.map((d) => ({ id: d.id, name: d.name })),
          databases: orgDatabases.map((d) => ({ id: d.id, name: d.name })),
          discordBots: orgDiscordBots.map((b) => ({ id: b.id, name: b.name })),
          telegramBots: orgTelegramBots.map((b) => ({
            id: b.id,
            name: b.name,
          })),
          whatsappAccounts: orgWhatsAppAccounts.map((a) => ({
            id: a.id,
            name: a.name,
          })),
        };
      }

      case "listTemplates": {
        const tag = input.tag as string | undefined;
        let templates = workflowTemplates;
        if (tag) {
          templates = templates.filter((t) =>
            t.tags.some((tg) => tg.toLowerCase() === tag.toLowerCase())
          );
        }
        return {
          templates: templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            tags: t.tags,
            trigger: t.trigger,
          })),
        };
      }

      case "checkTemplateRequirements": {
        const templateId = input.templateId as string;
        const template = workflowTemplates.find((t) => t.id === templateId);
        if (!template) return { error: `Template "${templateId}" not found` };

        const requiredIntegrations = new Set<string>();
        for (const node of template.nodes) {
          const provider = INTEGRATION_NODE_MAP[node.type];
          if (provider) requiredIntegrations.add(provider);
        }

        const orgIntegrations = await getIntegrations(db, orgId);
        const connectedProviders = new Set<string>(
          orgIntegrations.map((i) => i.provider)
        );

        const missing: string[] = [];
        for (const required of requiredIntegrations) {
          if (!connectedProviders.has(required)) missing.push(required);
        }

        return {
          templateId: template.id,
          templateName: template.name,
          requiredIntegrations: [...requiredIntegrations],
          missingIntegrations: missing,
          ready: missing.length === 0,
        };
      }

      case "listResources": {
        const resourceType = input.resourceType as string;
        switch (resourceType) {
          case "workflows": {
            const workflows = await new WorkflowStore(this.env).list(orgId);
            return {
              resources: workflows.map((w) => ({
                id: w.id,
                name: w.name,
                trigger: w.trigger,
              })),
            };
          }
          case "endpoints": {
            const endpoints = await getEndpoints(db, orgId);
            return {
              resources: endpoints.map((e) => ({
                id: e.id,
                name: e.name,
                mode: e.mode,
              })),
            };
          }
          case "emails": {
            const emails = await getEmails(db, orgId);
            return {
              resources: emails.map((e) => ({ id: e.id, name: e.name })),
            };
          }
          case "queues": {
            const queuesResult = await getQueues(db, orgId);
            return {
              resources: queuesResult.map((q) => ({
                id: q.id,
                name: q.name,
              })),
            };
          }
          case "datasets": {
            const datasets = await getDatasets(db, orgId);
            return {
              resources: datasets.map((d) => ({ id: d.id, name: d.name })),
            };
          }
          case "databases": {
            const databases = await getDatabases(db, orgId);
            return {
              resources: databases.map((d) => ({ id: d.id, name: d.name })),
            };
          }
          case "integrations": {
            const integrations = await getIntegrations(db, orgId);
            return {
              resources: integrations.map((i) => ({
                id: i.id,
                name: i.name,
                provider: i.provider,
                status: i.status,
              })),
            };
          }
          case "secrets": {
            const secrets = await getSecrets(db, orgId);
            return {
              resources: secrets.map((s) => ({ id: s.id, name: s.name })),
            };
          }
          case "discord-bots": {
            const bots = await getDiscordBots(db, orgId);
            return {
              resources: bots.map((b) => ({ id: b.id, name: b.name })),
            };
          }
          case "telegram-bots": {
            const bots = await getTelegramBots(db, orgId);
            return {
              resources: bots.map((b) => ({ id: b.id, name: b.name })),
            };
          }
          case "whatsapp-accounts": {
            const accounts = await getWhatsAppAccounts(db, orgId);
            return {
              resources: accounts.map((a) => ({ id: a.id, name: a.name })),
            };
          }
          default:
            return { error: `Unknown resource type: ${resourceType}` };
        }
      }

      case "navigateUser": {
        const page = input.page as string;
        const resourceId = input.resourceId as string | undefined;
        let path: string;
        if (resourceId) {
          path = `/${page}/${resourceId}`;
        } else {
          path = `/${page}`;
        }
        connection.send(
          JSON.stringify({
            type: "navigate",
            path,
          } satisfies AssistantServerMessage)
        );
        return { navigated: true, path };
      }

      case "searchNodes": {
        const query = (input.query as string).toLowerCase();
        const registry = new CloudflareNodeRegistry(this.env, false);
        const allNodes = registry.getNodeTypes();
        const matches = allNodes.filter((n) => {
          const haystack = [n.name, n.type, n.description ?? "", ...n.tags]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });
        return {
          results: matches.slice(0, 20).map((n) => ({
            type: n.type,
            name: n.name,
            description: n.description,
            tags: n.tags,
            inputs: n.inputs.map((p) => ({
              name: p.name,
              type: p.type,
              description: p.description,
            })),
            outputs: n.outputs.map((p) => ({
              name: p.name,
              type: p.type,
              description: p.description,
            })),
          })),
          total: matches.length,
        };
      }

      case "getWorkflow": {
        const workflowId = input.workflowId as string;
        const store = new WorkflowStore(this.env);
        const workflow = await store.getWithData(workflowId, orgId);
        if (!workflow) return { error: "Workflow not found" };

        return {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          trigger: workflow.trigger,
          runtime: workflow.runtime,
          nodes: workflow.data.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            name: n.name,
            position: n.position,
            inputs: n.inputs.map((p) => ({
              name: p.name,
              type: p.type,
              value: p.value,
            })),
            outputs: n.outputs.map((p) => ({
              name: p.name,
              type: p.type,
            })),
          })),
          edges: workflow.data.edges,
        };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
}
