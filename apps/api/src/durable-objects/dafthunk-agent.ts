import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicConfig } from "@dafthunk/runtime/utils/ai-gateway";
import type {
  OnboardingChatMessage,
  OnboardingClientMessage,
  OnboardingServerMessage,
} from "@dafthunk/types";
import { Agent } from "agents";
import type { Connection } from "partyserver";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "../context";
import {
  createDatabase,
  createDatabaseRecord,
  createDataset,
  createEmail,
  createEndpoint,
  createQueue,
  createSecret,
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

export interface OnboardingAgentState {
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
  // ── Creation tools ────────────────────────────────────────────────
  {
    name: "createWorkflowFromTemplate",
    description: "Create a workflow from a template.",
    input_schema: {
      type: "object" as const,
      properties: {
        templateId: { type: "string", description: "Template ID" },
        customName: { type: "string", description: "Custom workflow name" },
        aiPromptOverrides: {
          type: "object",
          description: "Node ID → custom prompt for AI nodes",
          additionalProperties: { type: "string" },
        },
      },
      required: ["templateId"],
    },
  },
  {
    name: "createSecret",
    description:
      "Store a secret (API key, token). Only use when the user explicitly provides a credential value.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Secret name (e.g. OPENAI_API_KEY)",
        },
        value: { type: "string", description: "Secret value" },
      },
      required: ["name", "value"],
    },
  },
  {
    name: "createEndpoint",
    description: "Create an HTTP endpoint (webhook or request-response).",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Endpoint name" },
        mode: {
          type: "string",
          enum: ["webhook", "request"],
          description:
            "webhook (fire-and-forget) or request (wait for response)",
        },
      },
      required: ["name", "mode"],
    },
  },
  {
    name: "createEmail",
    description:
      "Create an @dafthunk.com email address for triggering workflows.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Email prefix (e.g. 'support' → support@dafthunk.com)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "createQueue",
    description: "Create a message queue for async workflow triggering.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Queue name" },
      },
      required: ["name"],
    },
  },
  {
    name: "createDataset",
    description: "Create a dataset for storing files (CSV, JSON, etc).",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Dataset name" },
      },
      required: ["name"],
    },
  },
  {
    name: "createDatabase",
    description: "Create a SQLite database for structured data storage.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Database name" },
      },
      required: ["name"],
    },
  },
  {
    name: "connectIntegration",
    description:
      "Get the OAuth URL to connect an integration. Returns a link the user must open in their browser.",
    input_schema: {
      type: "object" as const,
      properties: {
        provider: {
          type: "string",
          enum: [
            "google-mail",
            "google-calendar",
            "discord",
            "github",
            "reddit",
            "linkedin",
          ],
          description: "Integration provider",
        },
      },
      required: ["provider"],
    },
  },
  // ── Node & workflow editing tools ─────────────────────────────────
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
  {
    name: "updateWorkflow",
    description:
      "Update a workflow. Can rename, change description/trigger, update node inputs, add nodes, remove nodes, add edges, or remove edges.",
    input_schema: {
      type: "object" as const,
      properties: {
        workflowId: { type: "string", description: "Workflow ID" },
        name: { type: "string", description: "New workflow name" },
        description: { type: "string", description: "New description" },
        trigger: { type: "string", description: "New trigger type" },
        updateNodeInputs: {
          type: "array",
          description: "Update inputs on existing nodes",
          items: {
            type: "object",
            properties: {
              nodeId: { type: "string" },
              inputs: {
                type: "object",
                description: "Input name → new value",
                additionalProperties: {},
              },
            },
            required: ["nodeId", "inputs"],
          },
        },
        addNodes: {
          type: "array",
          description: "Nodes to add (type, name, position)",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description: "Node type from searchNodes",
              },
              name: { type: "string", description: "Display name" },
              positionX: { type: "number" },
              positionY: { type: "number" },
              inputs: {
                type: "object",
                description: "Input name → value",
                additionalProperties: {},
              },
            },
            required: ["type"],
          },
        },
        removeNodes: {
          type: "array",
          description: "Node IDs to remove",
          items: { type: "string" },
        },
        addEdges: {
          type: "array",
          description: "Edges to add",
          items: {
            type: "object",
            properties: {
              source: { type: "string", description: "Source node ID" },
              sourceOutput: {
                type: "string",
                description: "Source output name",
              },
              target: { type: "string", description: "Target node ID" },
              targetInput: { type: "string", description: "Target input name" },
            },
            required: ["source", "sourceOutput", "target", "targetInput"],
          },
        },
        removeEdges: {
          type: "array",
          description: "Edges to remove (by source+target node IDs)",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              target: { type: "string" },
            },
            required: ["source", "target"],
          },
        },
      },
      required: ["workflowId"],
    },
  },
];

const AI_NODE_TYPES = [
  "anthropic-chat",
  "openai-chat",
  "gemini-chat",
  "workers-ai-chat",
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
  createWorkflowFromTemplate: "Creating workflow...",
  listResources: "Listing resources...",
  navigateUser: "Navigating...",
  createSecret: "Storing secret...",
  createEndpoint: "Creating endpoint...",
  createEmail: "Creating email...",
  createQueue: "Creating queue...",
  createDataset: "Creating dataset...",
  createDatabase: "Creating database...",
  connectIntegration: "Getting OAuth link...",
  searchNodes: "Searching nodes...",
  getWorkflow: "Reading workflow...",
  updateWorkflow: "Updating workflow...",
};

export class DafthunkAgent extends Agent<Bindings, OnboardingAgentState> {
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
  ): OnboardingChatMessage[] {
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
      } satisfies OnboardingServerMessage)
    );
    connection.send(
      JSON.stringify({
        type: "conversations",
        conversations: this.listConversations(),
      } satisfies OnboardingServerMessage)
    );
  }

  async onMessage(connection: Connection, message: string): Promise<void> {
    try {
      this.ensureSchema();
      const parsed = JSON.parse(message as string) as OnboardingClientMessage;

      switch (parsed.type) {
        case "list_conversations": {
          connection.send(
            JSON.stringify({
              type: "conversations",
              conversations: this.listConversations(),
            } satisfies OnboardingServerMessage)
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
            } satisfies OnboardingServerMessage)
          );
          connection.send(
            JSON.stringify({
              type: "conversations",
              conversations: this.listConversations(),
            } satisfies OnboardingServerMessage)
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
            } satisfies OnboardingServerMessage)
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
              } satisfies OnboardingServerMessage)
            );
          }

          connection.send(
            JSON.stringify({
              type: "conversations",
              conversations: this.listConversations(),
            } satisfies OnboardingServerMessage)
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
              } satisfies OnboardingServerMessage)
            );
          }

          await this.runAgentLoop(connection, allMessages);
          return;
        }
      }
    } catch (error) {
      const errorMsg: OnboardingServerMessage = {
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      };
      connection.send(JSON.stringify(errorMsg));
    }
  }

  private async runAgentLoop(
    connection: Connection,
    chatHistory: OnboardingChatMessage[]
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

    while (continueLoop) {
      const startMsg: OnboardingServerMessage = { type: "stream_start" };
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
              } satisfies OnboardingServerMessage)
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
          } satisfies OnboardingServerMessage)
        );
        connection.send(
          JSON.stringify({
            type: "turn_complete",
            content: fullText,
          } satisfies OnboardingServerMessage)
        );

        continueLoop = false;
      } else {
        connection.send(
          JSON.stringify({
            type: "stream_end",
          } satisfies OnboardingServerMessage)
        );

        anthropicMessages.push({
          role: "assistant",
          content: finalMessage.content,
        });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolBlock of toolBlocks) {
          const progressMsg: OnboardingServerMessage = {
            type: "tool_progress",
            tool: toolBlock.name,
            description: TOOL_DESCRIPTIONS[toolBlock.name] ?? "Working...",
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

## Structured workflow: gather → create dependencies → create workflow

### Step 1: Gather information
- Call getOrgState to see all existing resources (workflows, integrations, secrets, endpoints, emails, queues, datasets, databases, bots).
- Call listTemplates to find matching templates for the user's use case.
- Call searchNodes to find relevant node types.

### Step 2: Identify & create dependencies
For each missing dependency the workflow needs:
- **Bots** (Discord, Telegram, WhatsApp): use navigateUser to send the user to the bots page — bot setup requires tokens that must be entered in the UI.
- **Integrations** (OAuth): use connectIntegration to get the OAuth URL. Format as markdown link.
- **Simple resources** (endpoints, emails, queues, datasets, databases): create directly with tools if you have the info, otherwise use navigateUser.
- After creating dependencies, verify with listResources.

### Step 3: Create workflow
- If a matching template exists, use checkTemplateRequirements then createWorkflowFromTemplate.
- Otherwise, create a blank workflow and use updateWorkflow to add nodes and edges.
- Link nodes to the correct resource IDs from step 2.
- When done, use navigateUser to open the workflow editor for the user.

## What you can do
- Create: workflows (from templates or scratch), secrets, endpoints, emails, queues, datasets, databases.
- Connect integrations: use connectIntegration for OAuth.
- Navigate: use navigateUser to send the user to any page (bots, integrations, workflows, etc).
- List resources: use listResources to check specific resource types.
- Search nodes: use searchNodes to find node types by keyword.
- Edit workflows: use getWorkflow to read, then updateWorkflow to modify.

## Rules
- Call getOrgState before recommending anything. Never guess what exists.
- Call checkTemplateRequirements before creating a workflow from template.
- Only call createSecret when the user gives you the actual value.
- Use navigateUser to direct users — never output raw URLs.
- Before editing a workflow, call getWorkflow to read its current state.
- Before adding a node, call searchNodes to find the correct type.`;
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

      case "createWorkflowFromTemplate": {
        const templateId = input.templateId as string;
        const customName = input.customName as string | undefined;
        const aiPromptOverrides = input.aiPromptOverrides as
          | Record<string, string>
          | undefined;

        const template = workflowTemplates.find((t) => t.id === templateId);
        if (!template) return { error: `Template "${templateId}" not found` };

        const nodes = structuredClone(template.nodes);

        if (aiPromptOverrides) {
          for (const node of nodes) {
            if (
              AI_NODE_TYPES.includes(node.type) &&
              aiPromptOverrides[node.id]
            ) {
              const promptInput = node.inputs.find(
                (i: { name: string }) =>
                  i.name === "system_prompt" || i.name === "instructions"
              );
              if (promptInput) {
                promptInput.value = aiPromptOverrides[node.id];
              }
            }
          }
        }

        const userProfile = this.state?.userProfile;
        if (userProfile?.preferredTone) {
          for (const node of nodes) {
            if (AI_NODE_TYPES.includes(node.type)) {
              if (aiPromptOverrides && aiPromptOverrides[node.id]) continue;
              const promptInput = node.inputs.find(
                (i: { name: string }) =>
                  i.name === "system_prompt" || i.name === "instructions"
              );
              if (promptInput && typeof promptInput.value === "string") {
                promptInput.value = `${promptInput.value}\n\nTone: ${userProfile.preferredTone}`;
              }
            }
          }
        }

        const workflowId = crypto.randomUUID();
        const workflow = await new WorkflowStore(this.env).save({
          id: workflowId,
          name: customName ?? template.name,
          description: template.description,
          trigger: template.trigger,
          organizationId: orgId,
          nodes,
          edges: structuredClone(template.edges),
        });

        return { workflowId: workflow.id, name: workflow.name };
      }

      case "createSecret": {
        const secretName = input.name as string;
        const secretValue = input.value as string;
        await createSecret(db, orgId, secretName, secretValue, this.env);
        return { name: secretName, created: true };
      }

      case "createEndpoint": {
        const id = uuidv7();
        const endpoint = await createEndpoint(db, {
          id,
          name: input.name as string,
          mode: input.mode as "webhook" | "request",
          organizationId: orgId,
        });
        return { id: endpoint.id, name: endpoint.name, mode: endpoint.mode };
      }

      case "createEmail": {
        const id = uuidv7();
        const email = await createEmail(db, {
          id,
          name: input.name as string,
          organizationId: orgId,
        });
        return {
          id: email.id,
          name: email.name,
          address: `${email.name}@${this.env.EMAIL_DOMAIN || "dafthunk.com"}`,
        };
      }

      case "createQueue": {
        const id = uuidv7();
        const queue = await createQueue(db, {
          id,
          name: input.name as string,
          organizationId: orgId,
        });
        return { id: queue.id, name: queue.name };
      }

      case "createDataset": {
        const id = uuidv7();
        const dataset = await createDataset(db, {
          id,
          name: input.name as string,
          organizationId: orgId,
        });
        return { id: dataset.id, name: dataset.name };
      }

      case "createDatabase": {
        const id = uuidv7();
        const database = await createDatabaseRecord(db, {
          id,
          name: input.name as string,
          organizationId: orgId,
        });
        return { id: database.id, name: database.name };
      }

      case "connectIntegration": {
        const provider = input.provider as string;
        const webHost = this.env.WEB_HOST || "https://app.dafthunk.com";
        const integrationsUrl = `${webHost}/org/${orgId}/integrations`;
        return {
          provider,
          url: integrationsUrl,
          message: `Link the user to the integrations page to connect ${provider}. Format as markdown link.`,
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
          } satisfies OnboardingServerMessage)
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

      case "updateWorkflow": {
        const workflowId = input.workflowId as string;
        const store = new WorkflowStore(this.env);
        const workflow = await store.getWithData(workflowId, orgId);
        if (!workflow) return { error: "Workflow not found" };

        const nodes = structuredClone(workflow.data.nodes);
        let edges = structuredClone(workflow.data.edges);
        const newName = (input.name as string | undefined) ?? workflow.name;
        const newDescription =
          (input.description as string | undefined) ?? workflow.description;
        const newTrigger =
          (input.trigger as string | undefined) ?? workflow.trigger;

        // Update node inputs
        const updateNodeInputs = input.updateNodeInputs as
          | { nodeId: string; inputs: Record<string, unknown> }[]
          | undefined;
        if (updateNodeInputs) {
          for (const update of updateNodeInputs) {
            const node = nodes.find((n) => n.id === update.nodeId);
            if (!node) continue;
            for (const [inputName, value] of Object.entries(update.inputs)) {
              const param = node.inputs.find((p) => p.name === inputName);
              if (param) param.value = value;
            }
          }
        }

        // Add nodes
        const addNodes = input.addNodes as
          | {
              type: string;
              name?: string;
              positionX?: number;
              positionY?: number;
              inputs?: Record<string, unknown>;
            }[]
          | undefined;
        if (addNodes) {
          const registry = new CloudflareNodeRegistry(this.env, false);
          const allTypes = registry.getNodeTypes();
          for (const spec of addNodes) {
            const nodeType = allTypes.find((t) => t.type === spec.type);
            if (!nodeType) continue;
            const nodeId = uuidv7();
            const newNode = {
              id: nodeId,
              type: spec.type,
              name: spec.name ?? nodeType.name,
              position: {
                x: spec.positionX ?? 0,
                y: spec.positionY ?? 0,
              },
              inputs: nodeType.inputs.map((p) => ({
                ...p,
                value:
                  spec.inputs && spec.inputs[p.name] !== undefined
                    ? spec.inputs[p.name]
                    : p.value,
              })),
              outputs: nodeType.outputs.map((p) => ({ ...p })),
            };
            nodes.push(newNode);
          }
        }

        // Remove nodes
        const removeNodes = input.removeNodes as string[] | undefined;
        if (removeNodes) {
          const removeSet = new Set(removeNodes);
          const filtered = nodes.filter((n) => !removeSet.has(n.id));
          nodes.length = 0;
          nodes.push(...filtered);
          edges = edges.filter(
            (e) => !removeSet.has(e.source) && !removeSet.has(e.target)
          );
        }

        // Add edges
        const addEdges = input.addEdges as
          | {
              source: string;
              sourceOutput: string;
              target: string;
              targetInput: string;
            }[]
          | undefined;
        if (addEdges) {
          for (const edge of addEdges) {
            edges.push(edge);
          }
        }

        // Remove edges
        const removeEdges = input.removeEdges as
          | { source: string; target: string }[]
          | undefined;
        if (removeEdges) {
          for (const re of removeEdges) {
            edges = edges.filter(
              (e) => !(e.source === re.source && e.target === re.target)
            );
          }
        }

        await store.save({
          id: workflowId,
          name: newName,
          description: newDescription ?? undefined,
          trigger: newTrigger,
          organizationId: orgId,
          nodes,
          edges,
        });

        return {
          workflowId,
          name: newName,
          nodeCount: nodes.length,
          edgeCount: edges.length,
        };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
}
