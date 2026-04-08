import type { Node, Workflow as WorkflowType } from "@dafthunk/types";
import { and, desc, eq, inArray } from "drizzle-orm";

import type { Bindings } from "../context";
import { createDatabase, Database } from "../db";
import {
  deleteBotTrigger,
  deleteEmailTrigger,
  deleteQueueTrigger,
  deleteScheduledTrigger,
  getBot,
  getBotTrigger,
  updateBotTriggerMetadataByBot,
  upsertBotTrigger,
  upsertEmailTrigger,
  upsertQueueTrigger,
  upsertScheduledTrigger,
} from "../db/queries";
import type { BotProviderType, WorkflowRow } from "../db/schema";
import { memberships, organizations, workflows } from "../db/schema";
import { decryptSecret } from "../utils/encryption";

/**
 * Data required to save a workflow record
 */
export interface SaveWorkflowRecord {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  runtime?: string;
  organizationId: string;
  nodes: any[];
  edges: any[];
  createdAt?: Date;
  updatedAt?: Date;
  apiHost?: string;
}

/**
 * Manages workflow storage across D1 (metadata) and R2 (full data).
 * Provides a unified interface for workflow persistence operations.
 */
export class WorkflowStore {
  private db: Database;

  constructor(private env: Bindings) {
    this.db = createDatabase(env.DB);
  }

  /**
   * Extract queue ID from workflow nodes
   */
  private extractQueueId(nodes: Node[]): string | null {
    const queueNode = nodes.find((node) => node.type === "queue-message");
    if (!queueNode) return null;

    const queueIdInput = queueNode.inputs.find(
      (input) => input.name === "queueId"
    );
    if (!queueIdInput || !queueIdInput.value) return null;

    return queueIdInput.value as string;
  }

  /**
   * Extract email from workflow nodes
   */
  private extractEmail(nodes: Node[]): string | null {
    const emailNode = nodes.find((node) => node.type === "receive-email");
    if (!emailNode) return null;

    const emailInput = emailNode.inputs.find((input) => input.name === "email");
    if (!emailInput || !emailInput.value) return null;

    return emailInput.value as string;
  }

  /**
   * Extract schedule expression from workflow nodes
   */
  private extractScheduleExpression(nodes: Node[]): string | null {
    const scheduledNode = nodes.find(
      (node) => node.type === "receive-scheduled-trigger"
    );
    if (!scheduledNode) return null;

    const scheduleExpressionInput = scheduledNode.inputs.find(
      (input) => input.name === "scheduleExpression"
    );
    if (!scheduleExpressionInput || !scheduleExpressionInput.value) return null;

    return scheduleExpressionInput.value as string;
  }

  /**
   * Extract bot trigger config from workflow nodes for any provider.
   * Maps node type -> provider, extracts botId and provider-specific metadata.
   */
  private extractBotTriggerConfig(
    nodes: Node[],
    provider: BotProviderType
  ): { botId: string; metadata: Record<string, string> } | null {
    const nodeTypeMap: Record<string, string> = {
      discord: "receive-discord-message",
      telegram: "receive-telegram-message",
      whatsapp: "receive-whatsapp-message",
      slack: "receive-slack-message",
    };
    const botIdFieldMap: Record<string, string> = {
      discord: "discordBotId",
      telegram: "telegramBotId",
      whatsapp: "whatsappAccountId",
      slack: "slackBotId",
    };

    const nodeType = nodeTypeMap[provider];
    const botIdField = botIdFieldMap[provider];
    const node = nodes.find((n) => n.type === nodeType);
    if (!node) return null;

    const botId = node.inputs.find((i) => i.name === botIdField)?.value as
      | string
      | undefined;
    if (!botId) return null;

    const metadata: Record<string, string> = {};

    if (provider === "discord") {
      const commandName = node.inputs.find((i) => i.name === "commandName")
        ?.value as string | undefined;
      if (!commandName) return null;
      const sanitized = commandName.replace(/^\/+/, "").toLowerCase();
      if (!sanitized) return null;
      metadata.commandName = sanitized;
    } else if (provider === "telegram") {
      const chatId = node.inputs.find((i) => i.name === "chatId")?.value as
        | string
        | undefined;
      if (chatId) metadata.chatId = chatId;
    } else if (provider === "whatsapp") {
      const phoneNumberId = node.inputs.find((i) => i.name === "phoneNumberId")
        ?.value as string | undefined;
      if (phoneNumberId) metadata.phoneNumberId = phoneNumberId;
    } else if (provider === "slack") {
      const channelId = node.inputs.find((i) => i.name === "channelId")
        ?.value as string | undefined;
      if (channelId) metadata.channelId = channelId;
    }

    return { botId, metadata };
  }

  /**
   * Sync bot trigger: upsert/delete trigger for any provider.
   * Handles provider-specific side effects (Discord slash command, Telegram webhook, WhatsApp verify token).
   */
  private async syncBotTrigger(
    workflowId: string,
    organizationId: string,
    nodes: Node[],
    provider: BotProviderType,
    apiHost?: string
  ): Promise<void> {
    const nodeTypeMap: Record<string, string> = {
      discord: "receive-discord-message",
      telegram: "receive-telegram-message",
      whatsapp: "receive-whatsapp-message",
      slack: "receive-slack-message",
    };
    const nodeType = nodeTypeMap[provider];
    const config = this.extractBotTriggerConfig(nodes, provider);
    const hasReceiveNode = nodes.some((n) => n.type === nodeType);

    if (config) {
      const existing = await getBotTrigger(this.db, workflowId, organizationId);
      const existingMeta = existing?.metadata
        ? (JSON.parse(existing.metadata) as Record<string, string>)
        : {};
      const changed =
        !existing ||
        existing.botId !== config.botId ||
        JSON.stringify(existingMeta) !== JSON.stringify(config.metadata);

      if (!changed) return;

      // Discord: unregister old slash command if bot or command name changed
      if (provider === "discord" && existing?.botId) {
        const oldBot = await getBot(this.db, existing.botId, organizationId);
        if (oldBot) {
          const oldBotToken = await decryptSecret(
            oldBot.encryptedToken,
            this.env,
            organizationId
          );
          const oldMeta = oldBot.metadata
            ? (JSON.parse(oldBot.metadata) as { applicationId?: string })
            : {};
          if (oldMeta.applicationId && existingMeta.commandName) {
            await this.unregisterSlashCommand(
              oldMeta.applicationId,
              oldBotToken,
              existingMeta.commandName
            );
          }
        }
      }

      // Telegram: unregister old webhook if bot changed
      if (
        provider === "telegram" &&
        existing?.botId &&
        existing.botId !== config.botId
      ) {
        await this.unregisterTelegramWebhook(existing.botId, organizationId);
      }

      // Build metadata with provider-specific tokens
      const triggerMetadata = { ...config.metadata };
      if (provider === "telegram") {
        triggerMetadata.secretToken = crypto.randomUUID();
      }
      if (provider === "whatsapp") {
        // Preserve existing verify token or generate new one
        const existingVerifyToken = existingMeta.verifyToken;
        triggerMetadata.verifyToken =
          existingVerifyToken ?? crypto.randomUUID();
      }

      try {
        await upsertBotTrigger(this.db, {
          workflowId,
          organizationId,
          botId: config.botId,
          provider,
          metadata: JSON.stringify(triggerMetadata),
          active: true,
          updatedAt: new Date(),
        });

        // Provider-specific post-upsert actions
        if (provider === "discord") {
          const bot = await getBot(this.db, config.botId, organizationId);
          if (bot) {
            const botToken = await decryptSecret(
              bot.encryptedToken,
              this.env,
              organizationId
            );
            const botMeta = bot.metadata
              ? (JSON.parse(bot.metadata) as { applicationId?: string })
              : {};
            if (botMeta.applicationId) {
              await this.registerSlashCommand(
                botMeta.applicationId,
                botToken,
                triggerMetadata.commandName
              );
            }
          }
        }

        if (provider === "telegram" && apiHost) {
          const bot = await getBot(this.db, config.botId, organizationId);
          if (bot) {
            const botToken = await decryptSecret(
              bot.encryptedToken,
              this.env,
              organizationId
            );
            try {
              const resp = await fetch(
                `https://api.telegram.org/bot${botToken}/setWebhook`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    url: `${apiHost}/telegram/webhook/${config.botId}`,
                    secret_token: triggerMetadata.secretToken,
                    allowed_updates: ["message"],
                  }),
                }
              );
              const result = (await resp.json()) as {
                ok: boolean;
                description?: string;
              };
              if (!result.ok) {
                console.error(
                  "[BotTrigger] Telegram API rejected webhook:",
                  result.description
                );
              } else {
                // Sync secret token to all triggers using this bot
                await updateBotTriggerMetadataByBot(
                  this.db,
                  config.botId,
                  JSON.stringify(triggerMetadata)
                );
              }
            } catch (error) {
              console.error(
                "[BotTrigger] Failed to register Telegram webhook:",
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        } else if (provider === "telegram" && !apiHost) {
          console.warn(
            `[BotTrigger] No apiHost provided, skipping Telegram webhook registration for workflow=${workflowId}`
          );
        }

        if (provider === "whatsapp") {
          // Sync verify token to all triggers using this bot
          await updateBotTriggerMetadataByBot(
            this.db,
            config.botId,
            JSON.stringify(triggerMetadata)
          );
        }

        console.log(
          `Auto-registered ${provider} trigger: workflow=${workflowId}, bot=${config.botId}`
        );
      } catch (_error) {
        console.error(
          `Failed to create ${provider} trigger for workflow ${workflowId}`
        );
      }
    } else if (!hasReceiveNode) {
      // Node removed entirely — delete trigger and clean up
      try {
        const existing = await getBotTrigger(
          this.db,
          workflowId,
          organizationId
        );
        if (existing) {
          const deletedMeta = existing.metadata
            ? (JSON.parse(existing.metadata) as Record<string, string>)
            : {};
          await deleteBotTrigger(this.db, workflowId, organizationId);

          if (provider === "discord" && existing.botId) {
            const oldBot = await getBot(
              this.db,
              existing.botId,
              organizationId
            );
            if (oldBot) {
              const oldBotToken = await decryptSecret(
                oldBot.encryptedToken,
                this.env,
                organizationId
              );
              const oldBotMeta = oldBot.metadata
                ? (JSON.parse(oldBot.metadata) as { applicationId?: string })
                : {};
              if (oldBotMeta.applicationId && deletedMeta.commandName) {
                await this.unregisterSlashCommand(
                  oldBotMeta.applicationId,
                  oldBotToken,
                  deletedMeta.commandName
                );
              }
            }
          }

          if (provider === "telegram" && existing.botId) {
            await this.unregisterTelegramWebhook(
              existing.botId,
              organizationId
            );
          }
        }
      } catch (_error) {
        // Ignore — trigger didn't exist
      }
    }
  }

  /**
   * Register a single slash command with the Discord API.
   */
  private async registerSlashCommand(
    applicationId: string,
    botToken: string,
    commandName: string,
    commandDescription?: string
  ): Promise<void> {
    try {
      const resp = await fetch(
        `https://discord.com/api/v10/applications/${applicationId}/commands`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: commandName,
            description:
              commandDescription || `Run the ${commandName} workflow`,
            type: 1,
            options: [
              {
                name: "message",
                type: 3,
                description: "Input message for the workflow",
                required: false,
              },
            ],
          }),
        }
      );
      if (!resp.ok) {
        const body = await resp.text();
        console.error(
          `[BotTrigger] Failed to register slash command: ${resp.status} ${body}`
        );
      } else {
        console.log(`[BotTrigger] Slash command registered: /${commandName}`);
      }
    } catch (error) {
      console.error(
        "[BotTrigger] Failed to register slash command:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Unregister a slash command from the Discord API by name.
   */
  private async unregisterSlashCommand(
    applicationId: string,
    botToken: string,
    commandName: string
  ): Promise<void> {
    try {
      const listResp = await fetch(
        `https://discord.com/api/v10/applications/${applicationId}/commands`,
        {
          headers: { Authorization: `Bot ${botToken}` },
        }
      );
      if (!listResp.ok) return;

      const commands = (await listResp.json()) as Array<{
        id: string;
        name: string;
      }>;
      const command = commands.find((cmd) => cmd.name === commandName);
      if (!command) return;

      await fetch(
        `https://discord.com/api/v10/applications/${applicationId}/commands/${command.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` },
        }
      );
      console.log(`[BotTrigger] Slash command unregistered: /${commandName}`);
    } catch (error) {
      console.error(
        "[BotTrigger] Failed to unregister slash command:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async unregisterTelegramWebhook(
    botId: string,
    organizationId: string
  ): Promise<void> {
    try {
      const bot = await getBot(this.db, botId, organizationId);
      if (bot) {
        const botToken = await decryptSecret(
          bot.encryptedToken,
          this.env,
          organizationId
        );
        await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
          method: "POST",
        });
      }
    } catch (error) {
      console.error(
        "[BotTrigger] Failed to unregister Telegram webhook:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Sync triggers for queue_message, email_message, scheduled, discord_event, telegram_event, whatsapp_event, and slack_event workflows
   * Directly upserts/deletes triggers without additional verification queries
   */
  private async syncTriggers(
    workflowId: string,
    workflowType: string,
    organizationId: string,
    nodes: Node[],
    apiHost?: string
  ): Promise<void> {
    // Handle queue_message workflows
    if (workflowType === "queue_message") {
      const queueId = this.extractQueueId(nodes);

      if (queueId) {
        try {
          await upsertQueueTrigger(this.db, {
            workflowId,
            queueId,
            active: true,
            updatedAt: new Date(),
          });
          console.log(
            `Auto-registered queue trigger: workflow=${workflowId}, queue=${queueId}`
          );
        } catch (_error) {
          console.error(
            `Failed to create queue trigger for workflow ${workflowId}`
          );
        }
      } else {
        // No queue node - delete trigger if exists
        try {
          await deleteQueueTrigger(this.db, workflowId, organizationId);
        } catch (_error) {
          // Ignore - trigger didn't exist
        }
      }
    }

    // Handle email_message workflows
    if (workflowType === "email_message") {
      const emailId = this.extractEmail(nodes);

      if (emailId) {
        try {
          await upsertEmailTrigger(this.db, {
            workflowId,
            emailId,
            active: true,
            updatedAt: new Date(),
          });
          console.log(
            `Auto-registered email trigger: workflow=${workflowId}, email=${emailId}`
          );
        } catch (_error) {
          console.error(
            `Failed to create email trigger for workflow ${workflowId}`
          );
        }
      } else {
        // No email node - delete trigger if exists
        try {
          await deleteEmailTrigger(this.db, workflowId, organizationId);
        } catch (_error) {
          // Ignore - trigger didn't exist
        }
      }
    }

    // Handle scheduled workflows
    if (workflowType === "scheduled") {
      const scheduleExpression = this.extractScheduleExpression(nodes);

      if (scheduleExpression) {
        try {
          await upsertScheduledTrigger(this.db, {
            workflowId,
            scheduleExpression,
            active: true,
            updatedAt: new Date(),
          });
          console.log(
            `Auto-registered scheduled trigger: workflow=${workflowId}, schedule=${scheduleExpression}`
          );
        } catch (_error) {
          console.error(
            `Failed to create scheduled trigger for workflow ${workflowId}`
          );
        }
      } else {
        // No scheduled node - delete trigger if exists
        try {
          await deleteScheduledTrigger(this.db, workflowId);
        } catch (_error) {
          // Ignore - trigger didn't exist
        }
      }
    }

    // Handle bot event workflows (discord, telegram, whatsapp, slack)
    const botProviderMap: Record<string, BotProviderType> = {
      discord_event: "discord",
      telegram_event: "telegram",
      whatsapp_event: "whatsapp",
      slack_event: "slack",
    };
    const botProvider = botProviderMap[workflowType];
    if (botProvider) {
      await this.syncBotTrigger(
        workflowId,
        organizationId,
        nodes,
        botProvider,
        apiHost
      );
    }
  }

  /**
   * Save workflow metadata to D1 and full data to R2
   */
  async save(record: SaveWorkflowRecord): Promise<WorkflowType> {
    const now = new Date();
    const { nodes, edges, ...dbFields } = record;

    // Create the workflow object for return and R2 storage
    const workflowData: WorkflowType = {
      id: record.id,
      name: record.name,
      description: record.description,
      trigger: record.trigger as any,
      runtime: (record.runtime as any) || "workflow",
      nodes,
      edges,
    };

    // Create metadata record for D1
    const dbRecord = {
      ...dbFields,
      updatedAt: record.updatedAt ?? now,
      createdAt: record.createdAt ?? now,
    };

    // Save metadata to D1
    await this.writeToD1(dbRecord);

    // Auto-sync triggers based on workflow structure
    await this.syncTriggers(
      record.id,
      record.trigger,
      record.organizationId,
      nodes,
      record.apiHost
    );

    // Save full data to R2
    await this.writeToR2(workflowData);

    return workflowData;
  }

  /**
   * Get workflow metadata from D1
   */
  async get(
    workflowId: string,
    organizationId: string
  ): Promise<WorkflowRow | undefined> {
    return this.readFromD1(workflowId, organizationId);
  }

  /**
   * Get workflow metadata from D1 and full data from R2
   */
  async getWithData(
    workflowId: string,
    organizationId: string
  ): Promise<(WorkflowRow & { data: WorkflowType }) | undefined> {
    const workflow = await this.readFromD1(workflowId, organizationId);

    if (!workflow) {
      return undefined;
    }

    try {
      const workflowData = await this.readFromR2(workflow.id);
      return {
        ...workflow,
        data: workflowData,
      };
    } catch (error) {
      console.error(
        `WorkflowStore.getWithData: Failed to read workflow data from R2 for ${workflow.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * List workflows for an organization
   */
  async list(organizationId: string): Promise<WorkflowRow[]> {
    return this.listFromD1(organizationId);
  }

  /**
   * Delete workflow from both D1 and R2
   */
  async delete(
    workflowId: string,
    organizationId: string
  ): Promise<WorkflowRow | undefined> {
    try {
      // Get workflow first to ensure it exists and get the ID
      const workflow = await this.readFromD1(workflowId, organizationId);

      if (!workflow) {
        return undefined;
      }

      // Delete from D1
      const deleted = await this.deleteFromD1(workflow.id, organizationId);

      // Delete from R2
      if (deleted) {
        await this.deleteFromR2(workflow.id);
      }

      return deleted;
    } catch (error) {
      console.error(
        `WorkflowStore.delete: Failed to delete ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update workflow metadata (name, type, timestamps)
   */
  async update(
    id: string,
    organizationId: string,
    data: Partial<WorkflowRow>
  ): Promise<WorkflowRow> {
    try {
      const now = new Date();
      const updateData = {
        ...data,
        updatedAt: now,
      };

      const results = await this.db
        .update(workflows)
        .set(updateData)
        .where(
          and(
            eq(workflows.id, id),
            eq(workflows.organizationId, organizationId)
          )
        )
        .returning();
      const workflow = Array.isArray(results) ? results[0] : (results as any);

      return workflow;
    } catch (error) {
      console.error(`WorkflowStore.update: Failed to update ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow with user access verification via organization memberships
   */
  async getWithUserAccess(
    workflowId: string,
    userId: string
  ): Promise<{ workflow: WorkflowRow; organizationId: string } | undefined> {
    try {
      const [result] = await this.db
        .select({
          workflow: workflows,
          organizationId: workflows.organizationId,
        })
        .from(workflows)
        .innerJoin(
          organizations,
          eq(workflows.organizationId, organizations.id)
        )
        .innerJoin(
          memberships,
          eq(workflows.organizationId, memberships.organizationId)
        )
        .where(
          and(eq(memberships.userId, userId), eq(workflows.id, workflowId))
        )
        .limit(1);

      if (!result) {
        return undefined;
      }

      return {
        workflow: result.workflow,
        organizationId: result.organizationId,
      };
    } catch (error) {
      console.error(
        `WorkflowStore.getWithUserAccess: Failed for ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get names for multiple workflows by their IDs
   */
  async getNames(
    workflowIds: string[]
  ): Promise<{ id: string; name: string }[]> {
    try {
      const results = await this.db
        .select({ id: workflows.id, name: workflows.name })
        .from(workflows)
        .where(inArray(workflows.id, workflowIds));

      return results;
    } catch (error) {
      console.error(`WorkflowStore.getNames: Failed to fetch names:`, error);
      throw error;
    }
  }

  /**
   * Get the name of a single workflow
   */
  async getName(
    workflowId: string,
    organizationId: string
  ): Promise<string | undefined> {
    try {
      const [result] = await this.db
        .select({ name: workflows.name })
        .from(workflows)
        .where(
          and(
            eq(workflows.id, workflowId),
            eq(workflows.organizationId, organizationId)
          )
        );

      return result?.name;
    } catch (error) {
      console.error(`WorkflowStore.getName: Failed for ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Write workflow metadata to D1
   */
  private async writeToD1(record: any): Promise<void> {
    try {
      await this.db
        .insert(workflows)
        .values(record)
        .onConflictDoUpdate({ target: workflows.id, set: record });
    } catch (error) {
      console.error(
        `WorkflowStore.writeToD1: Failed to write ${record.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Read workflow metadata from D1
   */
  private async readFromD1(
    workflowId: string,
    organizationId: string
  ): Promise<WorkflowRow | undefined> {
    try {
      const [workflow] = await this.db
        .select()
        .from(workflows)
        .where(
          and(
            eq(workflows.id, workflowId),
            eq(workflows.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!workflow) {
        return undefined;
      }

      return workflow;
    } catch (error) {
      console.error(
        `WorkflowStore.readFromD1: Failed to read ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * List workflows from D1
   */
  private async listFromD1(organizationId: string): Promise<WorkflowRow[]> {
    try {
      const results = await this.db
        .select({
          id: workflows.id,
          name: workflows.name,
          description: workflows.description,
          trigger: workflows.trigger,
          runtime: workflows.runtime,
          enabled: workflows.enabled,
          organizationId: workflows.organizationId,
          createdAt: workflows.createdAt,
          updatedAt: workflows.updatedAt,
        })
        .from(workflows)
        .where(eq(workflows.organizationId, organizationId))
        .orderBy(desc(workflows.updatedAt));

      return results;
    } catch (error) {
      console.error(
        `WorkflowStore.listFromD1: Failed to list workflows:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete workflow metadata from D1
   */
  private async deleteFromD1(
    id: string,
    organizationId: string
  ): Promise<WorkflowRow | undefined> {
    try {
      const results = await this.db
        .delete(workflows)
        .where(
          and(
            eq(workflows.id, id),
            eq(workflows.organizationId, organizationId)
          )
        )
        .returning();
      const deleted = Array.isArray(results) ? results[0] : (results as any);

      return deleted;
    } catch (error) {
      console.error(
        `WorkflowStore.deleteFromD1: Failed to delete ${id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Write workflow data to R2
   */
  private async writeToR2(workflow: WorkflowType): Promise<void> {
    try {
      if (!this.env.RESSOURCES) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `workflows/${workflow.id}/workflow.json`;
      await this.env.RESSOURCES.put(key, JSON.stringify(workflow), {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          workflowId: workflow.id,
          name: workflow.name,
          trigger: workflow.trigger,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        `WorkflowStore.writeToR2: Failed to write ${workflow.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Read workflow data from R2
   */
  private async readFromR2(workflowId: string): Promise<WorkflowType> {
    try {
      if (!this.env.RESSOURCES) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `workflows/${workflowId}/workflow.json`;
      const object = await this.env.RESSOURCES.get(key);

      if (!object) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const text = await object.text();
      return JSON.parse(text) as WorkflowType;
    } catch (error) {
      console.error(
        `WorkflowStore.readFromR2: Failed to read ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete workflow data from R2
   */
  private async deleteFromR2(workflowId: string): Promise<void> {
    try {
      if (!this.env.RESSOURCES) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `workflows/${workflowId}/workflow.json`;
      await this.env.RESSOURCES.delete(key);
    } catch (error) {
      console.error(
        `WorkflowStore.deleteFromR2: Failed to delete ${workflowId}:`,
        error
      );
      throw error;
    }
  }
}
