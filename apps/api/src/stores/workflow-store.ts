import type { Workflow as WorkflowType } from "@dafthunk/types";
import { and, eq, inArray } from "drizzle-orm";

import type { Bindings } from "../context";
import { createDatabase, Database } from "../db";
import { getOrganizationCondition, getWorkflowCondition } from "../db/queries";
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
          and(
            eq(workflows.organizationId, organizations.id),
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
        );

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
}
