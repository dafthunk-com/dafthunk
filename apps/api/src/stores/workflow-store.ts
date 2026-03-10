import type { Node, Workflow as WorkflowType } from "@dafthunk/types";
import { and, desc, eq, inArray } from "drizzle-orm";

import type { Bindings } from "../context";
import { createDatabase, Database } from "../db";
import {
  deleteDiscordTrigger,
  deleteEmailTrigger,
  deleteQueueTrigger,
  deleteScheduledTrigger,
  deleteTelegramTrigger,
  getDiscordBot,
  getDiscordTrigger,
  getOrganizationCondition,
  getTelegramBot,
  getTelegramTrigger,
  getWorkflowCondition,
  updateTelegramBotSecretToken,
  upsertDiscordTrigger,
  upsertEmailTrigger,
  upsertQueueTrigger,
  upsertScheduledTrigger,
  upsertTelegramTrigger,
} from "../db/queries";
import type { WorkflowRow } from "../db/schema";
import { memberships, organizations, workflows } from "../db/schema";
import { decryptSecret } from "../utils/encryption";

/**
 * Data required to save a workflow record
 */
export interface SaveWorkflowRecord {
  id: string;
  name: string;
  description?: string;
  handle: string;
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
   * Extract email ID from workflow nodes
   */
  private extractEmailId(nodes: Node[]): string | null {
    const emailNode = nodes.find((node) => node.type === "receive-email");
    if (!emailNode) return null;

    const emailIdInput = emailNode.inputs.find(
      (input) => input.name === "emailId"
    );
    if (!emailIdInput || !emailIdInput.value) return null;

    return emailIdInput.value as string;
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
   * Extract Discord trigger config from workflow nodes
   */
  private extractDiscordTriggerConfig(
    nodes: Node[]
  ): { discordBotId: string; commandName: string } | null {
    const node = nodes.find((n) => n.type === "receive-discord-message");
    if (!node) return null;

    const discordBotId = node.inputs.find((i) => i.name === "discordBotId")
      ?.value as string | undefined;
    const commandName = node.inputs.find((i) => i.name === "commandName")
      ?.value as string | undefined;

    if (!discordBotId || !commandName) return null;

    // Discord slash command names must be lowercase, no leading slash
    const sanitized = commandName.replace(/^\/+/, "").toLowerCase();
    if (!sanitized) return null;

    return { discordBotId, commandName: sanitized };
  }

  /**
   * Extract Telegram trigger config from workflow nodes
   */
  private extractTelegramTriggerConfig(
    nodes: Node[]
  ): { telegramBotId: string; chatId?: string } | null {
    const node = nodes.find((n) => n.type === "receive-telegram-message");
    if (!node) return null;

    const telegramBotId = node.inputs.find((i) => i.name === "telegramBotId")
      ?.value as string | undefined;
    const chatId = node.inputs.find((i) => i.name === "chatId")?.value as
      | string
      | undefined;

    if (!telegramBotId) return null;

    return { telegramBotId, chatId: chatId || undefined };
  }

  /**
   * Sync Discord trigger: upsert/delete trigger and register slash command
   */
  private async syncDiscordTrigger(
    workflowId: string,
    organizationId: string,
    nodes: Node[],
    apiHost?: string
  ): Promise<void> {
    const config = this.extractDiscordTriggerConfig(nodes);
    const hasReceiveNode = nodes.some(
      (n) => n.type === "receive-discord-message"
    );

    if (config) {
      // Check if config changed vs existing trigger
      const existing = await getDiscordTrigger(
        this.db,
        workflowId,
        organizationId
      );
      const changed =
        !existing ||
        existing.discordBotId !== config.discordBotId ||
        existing.commandName !== config.commandName;

      if (!changed) return;

      // Unregister old slash command if bot or command name changed
      if (existing && existing.discordBotId) {
        const oldBot = await getDiscordBot(
          this.db,
          existing.discordBotId,
          organizationId
        );
        if (oldBot) {
          const oldBotToken = await decryptSecret(
            oldBot.encryptedBotToken,
            this.env,
            organizationId
          );
          await this.unregisterSlashCommand(
            oldBot.applicationId,
            oldBotToken,
            existing.commandName
          );
        }
      }

      try {
        await upsertDiscordTrigger(this.db, {
          workflowId,
          organizationId,
          commandName: config.commandName,
          discordBotId: config.discordBotId,
          active: true,
          updatedAt: new Date(),
        });

        // Register slash command via Discord REST API
        const bot = await getDiscordBot(
          this.db,
          config.discordBotId,
          organizationId
        );
        if (bot) {
          const botToken = await decryptSecret(
            bot.encryptedBotToken,
            this.env,
            organizationId
          );
          await this.registerSlashCommand(
            bot.applicationId,
            botToken,
            config.commandName
          );
        }

        console.log(
          `Auto-registered discord trigger: workflow=${workflowId}, command=${config.commandName}`
        );
      } catch (_error) {
        console.error(
          `Failed to create discord trigger for workflow ${workflowId}`
        );
      }
    } else if (!hasReceiveNode) {
      // Node removed entirely — delete trigger and unregister command
      try {
        const existing = await getDiscordTrigger(
          this.db,
          workflowId,
          organizationId
        );
        if (existing) {
          await deleteDiscordTrigger(this.db, workflowId, organizationId);
          if (existing.discordBotId) {
            const oldBot = await getDiscordBot(
              this.db,
              existing.discordBotId,
              organizationId
            );
            if (oldBot) {
              const oldBotToken = await decryptSecret(
                oldBot.encryptedBotToken,
                this.env,
                organizationId
              );
              await this.unregisterSlashCommand(
                oldBot.applicationId,
                oldBotToken,
                existing.commandName
              );
            }
          }
        }
      } catch (_error) {
        // Ignore — trigger didn't exist
      }
    }
    // If node exists but inputs are empty, leave existing trigger alone (backward compat)
  }

  /**
   * Sync Telegram trigger: upsert/delete trigger and register/unregister webhook
   */
  private async syncTelegramTrigger(
    workflowId: string,
    organizationId: string,
    nodes: Node[],
    apiHost?: string
  ): Promise<void> {
    const config = this.extractTelegramTriggerConfig(nodes);
    const hasReceiveNode = nodes.some(
      (n) => n.type === "receive-telegram-message"
    );

    if (config) {
      const existing = await getTelegramTrigger(
        this.db,
        workflowId,
        organizationId
      );
      const configChanged =
        !existing ||
        existing.telegramBotId !== config.telegramBotId ||
        (existing.chatId ?? undefined) !== config.chatId;

      // Unregister old webhook if bot changed
      if (
        existing &&
        existing.telegramBotId &&
        existing.telegramBotId !== config.telegramBotId
      ) {
        await this.unregisterTelegramWebhook(
          existing.telegramBotId,
          organizationId
        );
      }

      const secretToken = crypto.randomUUID();

      try {
        if (configChanged) {
          await upsertTelegramTrigger(this.db, {
            workflowId,
            organizationId,
            chatId: config.chatId,
            telegramBotId: config.telegramBotId,
            secretToken,
            active: true,
            updatedAt: new Date(),
          });
        }

        // Register webhook with Telegram
        if (!apiHost) {
          console.warn(
            `[TelegramTrigger] No apiHost provided, skipping webhook registration for workflow=${workflowId}`
          );
        }
        if (apiHost) {
          const bot = await getTelegramBot(
            this.db,
            config.telegramBotId,
            organizationId
          );
          if (bot) {
            const botToken = await decryptSecret(
              bot.encryptedBotToken,
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
                    url: `${apiHost}/telegram/webhook/${config.telegramBotId}`,
                    secret_token: secretToken,
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
                  "[TelegramTrigger] Telegram API rejected webhook:",
                  result.description
                );
              } else {
                console.log(
                  `[TelegramTrigger] Webhook registered: ${apiHost}/telegram/webhook/${config.telegramBotId}`
                );
                // Sync secret token to all triggers using this bot
                // (Telegram only allows one webhook per bot)
                await updateTelegramBotSecretToken(
                  this.db,
                  config.telegramBotId,
                  secretToken
                );
              }
            } catch (error) {
              console.error(
                "[TelegramTrigger] Failed to register webhook:",
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        }

        console.log(
          `Auto-registered telegram trigger: workflow=${workflowId}, bot=${config.telegramBotId}, chat=${config.chatId ?? "any"}`
        );
      } catch (_error) {
        console.error(
          `Failed to create telegram trigger for workflow ${workflowId}`
        );
      }
    } else if (!hasReceiveNode) {
      // Node removed entirely — delete trigger
      try {
        const existing = await getTelegramTrigger(
          this.db,
          workflowId,
          organizationId
        );
        if (existing) {
          await deleteTelegramTrigger(this.db, workflowId, organizationId);
          if (existing.telegramBotId) {
            await this.unregisterTelegramWebhook(
              existing.telegramBotId,
              organizationId
            );
          }
        }
      } catch (_error) {
        // Ignore — trigger didn't exist
      }
    }
    // If node exists but inputs are empty, leave existing trigger alone (backward compat)
  }

  /**
   * Register a single slash command with the Discord API (upsert, does not affect other commands).
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
          `[DiscordTrigger] Failed to register slash command: ${resp.status} ${body}`
        );
      } else {
        console.log(
          `[DiscordTrigger] Slash command registered: /${commandName}`
        );
      }
    } catch (error) {
      console.error(
        "[DiscordTrigger] Failed to register slash command:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Unregister a slash command from the Discord API by name.
   * Looks up the command ID first, then deletes it.
   */
  private async unregisterSlashCommand(
    applicationId: string,
    botToken: string,
    commandName: string
  ): Promise<void> {
    try {
      // List all commands to find the one by name
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
      console.log(
        `[DiscordTrigger] Slash command unregistered: /${commandName}`
      );
    } catch (error) {
      console.error(
        "[DiscordTrigger] Failed to unregister slash command:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async unregisterTelegramWebhook(
    telegramBotId: string,
    organizationId: string
  ): Promise<void> {
    // Only unregister if no other triggers use this bot
    try {
      const bot = await getTelegramBot(this.db, telegramBotId, organizationId);
      if (bot) {
        const botToken = await decryptSecret(
          bot.encryptedBotToken,
          this.env,
          organizationId
        );
        await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
          method: "POST",
        });
      }
    } catch (error) {
      console.error(
        "[TelegramTrigger] Failed to unregister webhook:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Sync triggers for queue_message, email_message, scheduled, discord_event, and telegram_event workflows
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
      const emailId = this.extractEmailId(nodes);

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

    // Handle discord_event workflows
    if (workflowType === "discord_event") {
      await this.syncDiscordTrigger(workflowId, organizationId, nodes, apiHost);
    }

    // Handle telegram_event workflows
    if (workflowType === "telegram_event") {
      await this.syncTelegramTrigger(
        workflowId,
        organizationId,
        nodes,
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
      handle: record.handle,
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
    workflowIdOrHandle: string,
    organizationIdOrHandle: string
  ): Promise<WorkflowRow | undefined> {
    return this.readFromD1(workflowIdOrHandle, organizationIdOrHandle);
  }

  /**
   * Get workflow metadata from D1 and full data from R2
   */
  async getWithData(
    workflowIdOrHandle: string,
    organizationIdOrHandle: string
  ): Promise<(WorkflowRow & { data: WorkflowType }) | undefined> {
    const workflow = await this.readFromD1(
      workflowIdOrHandle,
      organizationIdOrHandle
    );

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
  async list(organizationIdOrHandle: string): Promise<WorkflowRow[]> {
    return this.listFromD1(organizationIdOrHandle);
  }

  /**
   * Delete workflow from both D1 and R2
   */
  async delete(
    workflowIdOrHandle: string,
    organizationId: string
  ): Promise<WorkflowRow | undefined> {
    try {
      // Get workflow first to ensure it exists and get the ID
      const workflow = await this.readFromD1(
        workflowIdOrHandle,
        organizationId
      );

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
        `WorkflowStore.delete: Failed to delete ${workflowIdOrHandle}:`,
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
    workflowIdOrHandle: string,
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
          and(
            eq(memberships.userId, userId),
            getWorkflowCondition(workflowIdOrHandle)
          )
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
        `WorkflowStore.getWithUserAccess: Failed for ${workflowIdOrHandle}:`,
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
    workflowIdOrHandle: string,
    organizationIdOrHandle: string
  ): Promise<string | undefined> {
    try {
      const [result] = await this.db
        .select({ name: workflows.name })
        .from(workflows)
        .innerJoin(
          organizations,
          and(
            eq(workflows.organizationId, organizations.id),
            getOrganizationCondition(organizationIdOrHandle)
          )
        )
        .where(getWorkflowCondition(workflowIdOrHandle));

      return result?.name;
    } catch (error) {
      console.error(
        `WorkflowStore.getName: Failed for ${workflowIdOrHandle}:`,
        error
      );
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
    workflowIdOrHandle: string,
    organizationIdOrHandle: string
  ): Promise<WorkflowRow | undefined> {
    try {
      const [workflow] = await this.db
        .select()
        .from(workflows)
        .innerJoin(
          organizations,
          eq(workflows.organizationId, organizations.id)
        )
        .where(
          and(
            getOrganizationCondition(organizationIdOrHandle),
            getWorkflowCondition(workflowIdOrHandle)
          )
        )
        .limit(1);

      if (!workflow) {
        return undefined;
      }

      return workflow.workflows;
    } catch (error) {
      console.error(
        `WorkflowStore.readFromD1: Failed to read ${workflowIdOrHandle}:`,
        error
      );
      throw error;
    }
  }

  /**
   * List workflows from D1
   */
  private async listFromD1(
    organizationIdOrHandle: string
  ): Promise<WorkflowRow[]> {
    try {
      const results = await this.db
        .select({
          id: workflows.id,
          name: workflows.name,
          description: workflows.description,
          handle: workflows.handle,
          trigger: workflows.trigger,
          runtime: workflows.runtime,
          enabled: workflows.enabled,
          organizationId: workflows.organizationId,
          createdAt: workflows.createdAt,
          updatedAt: workflows.updatedAt,
        })
        .from(workflows)
        .innerJoin(
          organizations,
          and(
            eq(workflows.organizationId, organizations.id),
            getOrganizationCondition(organizationIdOrHandle)
          )
        )
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

      const key = `workflows/${workflow.id}.json`;
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

      const key = `workflows/${workflowId}.json`;
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

      const key = `workflows/${workflowId}.json`;
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
