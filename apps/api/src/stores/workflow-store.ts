import type { Node, Workflow as WorkflowType } from "@dafthunk/types";
import { and, desc, eq, inArray } from "drizzle-orm";

import type { Bindings } from "../context";
import { createDatabase, Database } from "../db";
import {
  deleteEmailTrigger,
  deleteQueueTrigger,
  deleteScheduledTrigger,
  getOrganizationCondition,
  getWorkflowCondition,
  upsertEmailTrigger,
  upsertQueueTrigger,
  upsertScheduledTrigger,
} from "../db/queries";
import type { WorkflowRow } from "../db/schema";
import { memberships, organizations, workflows } from "../db/schema";

/**
 * Data required to save a workflow record
 */
export interface SaveWorkflowRecord {
  id: string;
  name: string;
  description?: string;
  handle: string;
  type: string;
  organizationId: string;
  nodes: any[];
  edges: any[];
  createdAt?: Date;
  updatedAt?: Date;
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
   * Sync triggers for queue_message, email_message, and scheduled workflows
   * Directly upserts/deletes triggers without additional verification queries
   */
  private async syncTriggers(
    workflowId: string,
    workflowType: string,
    organizationId: string,
    nodes: Node[]
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
      type: record.type as any,
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
      record.type,
      record.organizationId,
      nodes
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

      const [workflow] = await this.db
        .update(workflows)
        .set(updateData)
        .where(
          and(
            eq(workflows.id, id),
            eq(workflows.organizationId, organizationId)
          )
        )
        .returning();

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
          type: workflows.type,
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
      const [deleted] = await this.db
        .delete(workflows)
        .where(
          and(
            eq(workflows.id, id),
            eq(workflows.organizationId, organizationId)
          )
        )
        .returning();

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
          type: workflow.type,
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

  /**
   * Set the active deployment ID for a workflow
   */
  async setActiveDeployment(
    workflowIdOrHandle: string,
    organizationIdOrHandle: string,
    deploymentId: string | null
  ): Promise<void> {
    // First get the workflow to verify access and get IDs
    const workflow = await this.readFromD1(
      workflowIdOrHandle,
      organizationIdOrHandle
    );

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Update the active deployment ID
    await this.db
      .update(workflows)
      .set({ activeDeploymentId: deploymentId })
      .where(eq(workflows.id, workflow.id));
  }
}
