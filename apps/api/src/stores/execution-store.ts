import type { NodeExecution, WorkflowExecution } from "@dafthunk/types";
import { and, desc, eq, SQL } from "drizzle-orm";

import { createDatabase, Database } from "../db";
import { getOrganizationCondition } from "../db/queries";
import type { ExecutionRow, ExecutionStatusType } from "../db/schema";
import { executions, organizations } from "../db/schema";

/**
 * Data required to save an execution record
 */
export interface SaveExecutionRecord {
  id: string;
  workflowId: string;
  deploymentId?: string;
  userId: string;
  organizationId: string;
  status: ExecutionStatusType;
  nodeExecutions: NodeExecution[];
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
}

/**
 * Options for listing executions
 */
export interface ListExecutionsOptions {
  workflowId?: string;
  deploymentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Manages execution storage across D1 (metadata) and R2 (full data).
 * Provides a unified interface for execution persistence operations.
 */
export class ExecutionStore {
  constructor(
    d1: D1Database,
    private bucket: R2Bucket
  ) {
    this.db = createDatabase(d1);
  }

  private db: Database;

  /**
   * Save execution metadata to D1 and full data to R2
   */
  async save(record: SaveExecutionRecord): Promise<WorkflowExecution> {
    const now = new Date();
    const { nodeExecutions, userId, deploymentId, ...dbFields } = record;

    // Create the execution object for return and R2 storage
    const executionData: WorkflowExecution = {
      id: record.id,
      workflowId: record.workflowId,
      deploymentId: record.deploymentId,
      status: record.status as any,
      nodeExecutions,
      error: record.error,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
    };

    // Create metadata record for D1
    const dbRecord = {
      ...dbFields,
      deploymentId: deploymentId,
      updatedAt: record.updatedAt ?? now,
      createdAt: record.createdAt ?? now,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
    };

    // Save metadata to D1
    await this.writeToD1(dbRecord);

    // Save full data to R2
    await this.writeToR2(executionData);

    return executionData;
  }

  /**
   * Get execution metadata from D1
   */
  async get(
    id: string,
    organizationIdOrHandle: string
  ): Promise<ExecutionRow | undefined> {
    return this.readFromD1(id, organizationIdOrHandle);
  }

  /**
   * Get execution metadata from D1 and full data from R2
   */
  async getWithData(
    id: string,
    organizationIdOrHandle: string
  ): Promise<(ExecutionRow & { data: WorkflowExecution }) | undefined> {
    const execution = await this.readFromD1(id, organizationIdOrHandle);

    if (!execution) {
      return undefined;
    }

    try {
      const executionData = await this.readFromR2(execution.id);
      return {
        ...execution,
        data: executionData,
      };
    } catch (error) {
      console.error(
        `ExecutionStore.getWithData: Failed to read execution data from R2 for ${execution.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * List executions with optional filtering and pagination
   */
  async list(
    organizationIdOrHandle: string,
    options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]> {
    return this.listFromD1(organizationIdOrHandle, options);
  }

  /**
   * Delete execution from both D1 and R2
   */
  async delete(id: string, organizationId: string): Promise<boolean> {
    try {
      // Delete from D1
      const deleted = await this.deleteFromD1(id, organizationId);

      // Delete from R2
      if (deleted) {
        await this.deleteFromR2(id);
      }

      return deleted;
    } catch (error) {
      console.error(`ExecutionStore.delete: Failed to delete ${id}:`, error);
      throw error;
    }
  }

  /**
   * Write execution metadata to D1
   */
  private async writeToD1(record: any): Promise<void> {
    try {
      console.log(`ExecutionStore.writeToD1: Writing execution ${record.id}`);

      await this.db
        .insert(executions)
        .values(record)
        .onConflictDoUpdate({ target: executions.id, set: record });

      console.log(`ExecutionStore.writeToD1: Success for ${record.id}`);
    } catch (error) {
      console.error(
        `ExecutionStore.writeToD1: Failed to write ${record.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Read execution metadata from D1
   */
  private async readFromD1(
    id: string,
    organizationIdOrHandle: string
  ): Promise<ExecutionRow | undefined> {
    try {
      console.log(`ExecutionStore.readFromD1: Reading execution ${id}`);

      const [execution] = await this.db
        .select()
        .from(executions)
        .innerJoin(
          organizations,
          and(
            eq(executions.organizationId, organizations.id),
            getOrganizationCondition(organizationIdOrHandle)
          )
        )
        .where(eq(executions.id, id))
        .limit(1);

      if (!execution) {
        console.log(`ExecutionStore.readFromD1: Not found ${id}`);
        return undefined;
      }

      console.log(`ExecutionStore.readFromD1: Success for ${id}`);
      return execution.executions;
    } catch (error) {
      console.error(`ExecutionStore.readFromD1: Failed to read ${id}:`, error);
      throw error;
    }
  }

  /**
   * List executions from D1
   */
  private async listFromD1(
    organizationIdOrHandle: string,
    options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]> {
    try {
      console.log(
        `ExecutionStore.listFromD1: Listing executions for org ${organizationIdOrHandle}`
      );

      let query = this.db
        .select({ executions: executions })
        .from(executions)
        .innerJoin(
          organizations,
          eq(executions.organizationId, organizations.id)
        )
        .$dynamic();

      const conditions: SQL<unknown>[] = [];

      // Add organization condition
      conditions.push(getOrganizationCondition(organizationIdOrHandle));

      // Add optional filters
      if (options?.workflowId) {
        conditions.push(eq(executions.workflowId, options.workflowId));
      }

      if (options?.deploymentId) {
        conditions.push(eq(executions.deploymentId, options.deploymentId));
      }

      // Apply WHERE conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply ORDER BY
      query = query.orderBy(desc(executions.createdAt));

      // Apply LIMIT
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }

      // Apply OFFSET
      if (options?.offset !== undefined) {
        query = query.offset(options.offset);
      }

      const results = await query;

      console.log(
        `ExecutionStore.listFromD1: Found ${results.length} executions`
      );
      return results.map((item) => item.executions);
    } catch (error) {
      console.error(
        `ExecutionStore.listFromD1: Failed to list executions:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete execution metadata from D1
   */
  private async deleteFromD1(
    id: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      console.log(`ExecutionStore.deleteFromD1: Deleting execution ${id}`);

      const [deleted] = await this.db
        .delete(executions)
        .where(
          and(
            eq(executions.id, id),
            eq(executions.organizationId, organizationId)
          )
        )
        .returning({ id: executions.id });

      const success = !!deleted;
      console.log(
        `ExecutionStore.deleteFromD1: ${success ? "Success" : "Not found"} for ${id}`
      );
      return success;
    } catch (error) {
      console.error(
        `ExecutionStore.deleteFromD1: Failed to delete ${id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Write execution data to R2
   */
  private async writeToR2(execution: WorkflowExecution): Promise<void> {
    try {
      console.log(
        `ExecutionStore.writeToR2: Writing execution ${execution.id}`
      );

      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${execution.id}/execution.json`;
      const result = await this.bucket.put(key, JSON.stringify(execution), {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          workflowId: execution.workflowId,
          status: execution.status,
          updatedAt: new Date().toISOString(),
        },
      });

      console.log(
        `ExecutionStore.writeToR2: Success for ${execution.id}, etag: ${result?.etag || "unknown"}`
      );
    } catch (error) {
      console.error(
        `ExecutionStore.writeToR2: Failed to write ${execution.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Read execution data from R2
   */
  private async readFromR2(executionId: string): Promise<WorkflowExecution> {
    try {
      console.log(
        `ExecutionStore.readFromR2: Reading execution ${executionId}`
      );

      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/execution.json`;
      const object = await this.bucket.get(key);

      if (!object) {
        throw new Error(`Execution not found: ${executionId}`);
      }

      const text = await object.text();
      console.log(
        `ExecutionStore.readFromR2: Success for ${executionId}, size: ${object.size} bytes`
      );
      return JSON.parse(text) as WorkflowExecution;
    } catch (error) {
      console.error(
        `ExecutionStore.readFromR2: Failed to read ${executionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete execution data from R2
   */
  private async deleteFromR2(executionId: string): Promise<void> {
    try {
      console.log(
        `ExecutionStore.deleteFromR2: Deleting execution ${executionId}`
      );

      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/execution.json`;
      await this.bucket.delete(key);

      console.log(
        `ExecutionStore.deleteFromR2: Successfully deleted ${executionId}`
      );
    } catch (error) {
      console.error(
        `ExecutionStore.deleteFromR2: Failed to delete ${executionId}:`,
        error
      );
      throw error;
    }
  }
}
