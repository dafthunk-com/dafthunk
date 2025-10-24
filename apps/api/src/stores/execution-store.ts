import type {
  ExecutionStatusType,
  NodeExecution,
  WorkflowExecution,
} from "@dafthunk/types";

import type { Bindings } from "../context";

/**
 * Execution metadata row structure
 */
export interface ExecutionRow {
  id: string;
  workflowId: string;
  deploymentId: string | null;
  organizationId: string;
  status: ExecutionStatusType;
  error: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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
 * Manages execution storage across Analytics Engine (metadata) and R2 (full data).
 * Provides a unified interface for execution persistence operations.
 */
export class ExecutionStore {
  constructor(private env: Bindings) {}

  /**
   * Save execution metadata to Analytics Engine and full data to R2
   */
  async save(record: SaveExecutionRecord): Promise<WorkflowExecution> {
    const { nodeExecutions } = record;

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

    // Save metadata to Analytics Engine
    this.writeToAnalytics(record);

    // Save full data to R2
    await this.writeToR2(executionData);

    return executionData;
  }

  /**
   * Get execution metadata from Analytics Engine
   */
  async get(
    id: string,
    organizationId: string
  ): Promise<ExecutionRow | undefined> {
    return this.readFromAnalytics(id, organizationId);
  }

  /**
   * Get execution metadata from Analytics Engine and full data from R2
   */
  async getWithData(
    id: string,
    organizationId: string
  ): Promise<(ExecutionRow & { data: WorkflowExecution }) | undefined> {
    const execution = await this.readFromAnalytics(id, organizationId);

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
    organizationId: string,
    options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]> {
    return this.listFromAnalytics(organizationId, options);
  }

  /**
   * Write execution metadata to Analytics Engine
   */
  private writeToAnalytics(record: SaveExecutionRecord): void {
    try {
      console.log(
        `ExecutionStore.writeToAnalytics: Writing execution ${record.id}`
      );

      const durationMs =
        record.endedAt && record.startedAt
          ? record.endedAt.getTime() - record.startedAt.getTime()
          : 0;

      this.env.EXECUTIONS.writeDataPoint({
        indexes: [record.organizationId, record.id],
        blobs: [
          record.workflowId,
          record.deploymentId || "",
          record.status,
          (record.error || "").substring(0, 2000), // truncate to fit in blob
        ],
        doubles: [durationMs],
      });

      console.log(`ExecutionStore.writeToAnalytics: Success for ${record.id}`);
    } catch (error) {
      console.error(
        `ExecutionStore.writeToAnalytics: Failed to write ${record.id}:`,
        error
      );
      // Don't throw - Analytics Engine writes are fire-and-forget
    }
  }

  /**
   * Query Analytics Engine using SQL API
   */
  private async queryAnalytics(sql: string): Promise<any[]> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: sql,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Analytics query failed: ${response.statusText} - ${error}`
        );
      }

      const result = (await response.json()) as { data?: any[] };
      return result.data || [];
    } catch (error) {
      console.error(`ExecutionStore.queryAnalytics: Query failed:`, error);
      throw error;
    }
  }

  /**
   * Get the dataset name based on environment
   */
  private getDatasetName(): string {
    const env = this.env.CLOUDFLARE_ENV || "development";
    return env === "production"
      ? "dafthunk_executions_production"
      : "dafthunk_executions_development";
  }

  /**
   * Read execution metadata from Analytics Engine
   */
  private async readFromAnalytics(
    id: string,
    organizationId: string
  ): Promise<ExecutionRow | undefined> {
    try {
      console.log(`ExecutionStore.readFromAnalytics: Reading execution ${id}`);

      const dataset = this.getDatasetName();

      const sql = `
        SELECT *
        FROM ${dataset}
        WHERE index1 = '${organizationId}'
          AND index2 = '${id}'
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const rows = await this.queryAnalytics(sql);

      if (rows.length === 0) {
        console.log(`ExecutionStore.readFromAnalytics: Not found ${id}`);
        return undefined;
      }

      const row = rows[0];
      const timestamp = new Date(row.timestamp);

      console.log(`ExecutionStore.readFromAnalytics: Success for ${id}`);

      return {
        id: row.index2,
        workflowId: row.blob1,
        deploymentId: row.blob2 || null,
        organizationId: row.index1,
        status: row.blob3 as ExecutionStatusType,
        error: row.blob4 || null,
        startedAt: timestamp,
        endedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (error) {
      console.error(
        `ExecutionStore.readFromAnalytics: Failed to read ${id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * List executions from Analytics Engine
   */
  private async listFromAnalytics(
    organizationId: string,
    options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]> {
    try {
      console.log(
        `ExecutionStore.listFromAnalytics: Listing executions for org ${organizationId}`
      );

      const dataset = this.getDatasetName();

      const whereConditions = [`index1 = '${organizationId}'`];

      if (options?.workflowId) {
        whereConditions.push(`blob1 = '${options.workflowId}'`);
      }

      if (options?.deploymentId) {
        whereConditions.push(`blob2 = '${options.deploymentId}'`);
      }

      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const sql = `
        SELECT *
        FROM ${dataset}
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const rows = await this.queryAnalytics(sql);

      console.log(
        `ExecutionStore.listFromAnalytics: Found ${rows.length} executions`
      );

      return rows.map((row) => {
        const timestamp = new Date(row.timestamp);
        return {
          id: row.index2,
          workflowId: row.blob1,
          deploymentId: row.blob2 || null,
          organizationId: row.index1,
          status: row.blob3 as ExecutionStatusType,
          error: row.blob4 || null,
          startedAt: timestamp,
          endedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
      });
    } catch (error) {
      console.error(
        `ExecutionStore.listFromAnalytics: Failed to list executions:`,
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

      if (!this.env.RESSOURCES) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${execution.id}/execution.json`;
      const result = await this.env.RESSOURCES.put(
        key,
        JSON.stringify(execution),
        {
          httpMetadata: {
            contentType: "application/json",
            cacheControl: "no-cache",
          },
          customMetadata: {
            workflowId: execution.workflowId,
            status: execution.status,
            updatedAt: new Date().toISOString(),
          },
        }
      );

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

      if (!this.env.RESSOURCES) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/execution.json`;
      const object = await this.env.RESSOURCES.get(key);

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
}
