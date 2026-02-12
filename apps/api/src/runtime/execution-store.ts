import type {
  ExecutionRow,
  ExecutionStore,
  ListExecutionsOptions,
  SaveExecutionRecord,
} from "@dafthunk/runtime";
import type {
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

import type { Bindings } from "../context";

export type { ExecutionRow, ExecutionStore, ListExecutionsOptions, SaveExecutionRecord };

/**
 * Row shape returned by Analytics Engine SQL queries
 */
interface AnalyticsRow {
  timestamp: string;
  index1: string;
  blob1: string;
  blob2: string;
  blob3: string;
  blob4: string;
  blob5: string;
  double1: number;
  double2: number;
  double3: number;
  double4: number;
}

/**
 * Cloudflare-backed implementation of ExecutionStore.
 * Manages execution storage across Analytics Engine and R2.
 *
 * Architecture:
 * - **R2**: Primary storage for single execution lookups (immediate consistency)
 * - **Analytics Engine**: Query engine for listing/filtering executions (eventual consistency)
 *
 * All writes go to both stores, but reads use the appropriate store:
 * - `get()` / `getWithData()` → R2 (fast, immediate consistency)
 * - `list()` → Analytics Engine (powerful querying/filtering)
 */
export class CloudflareExecutionStore implements ExecutionStore {
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
      status: record.status,
      nodeExecutions,
      error: record.error,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
    };

    // Save metadata to Analytics Engine
    this.writeToAnalytics(record);

    // Save full data to R2
    await this.writeToR2(executionData, record.organizationId);

    return executionData;
  }

  /**
   * Get execution metadata from R2 (immediate consistency)
   */
  async get(
    id: string,
    organizationId: string
  ): Promise<ExecutionRow | undefined> {
    try {
      const executionData = await this.readFromR2(id, organizationId);
      return this.executionDataToRow(executionData, organizationId);
    } catch (error) {
      console.error(
        `ExecutionStore.get: Failed to read execution ${id}:`,
        error
      );
      return undefined;
    }
  }

  /**
   * Get execution metadata and full data from R2 (immediate consistency)
   */
  async getWithData(
    id: string,
    organizationId: string
  ): Promise<(ExecutionRow & { data: WorkflowExecution }) | undefined> {
    try {
      const executionData = await this.readFromR2(id, organizationId);
      const row = this.executionDataToRow(executionData, organizationId);
      return {
        ...row,
        data: executionData,
      };
    } catch (error) {
      console.error(
        `ExecutionStore.getWithData: Failed to read execution ${id}:`,
        error
      );
      return undefined;
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
      if (!this.env.EXECUTIONS) {
        console.warn(
          `ExecutionStore.writeToAnalytics: EXECUTIONS binding not available - skipping analytics write`
        );
        return;
      }

      const durationMs =
        record.endedAt && record.startedAt
          ? record.endedAt.getTime() - record.startedAt.getTime()
          : 0;

      const startedAtMs = record.startedAt?.getTime() ?? 0;
      const endedAtMs = record.endedAt?.getTime() ?? 0;

      // Sum usage from all node executions
      const usage = record.nodeExecutions.reduce(
        (sum, ne) => sum + (ne.usage ?? 0),
        0
      );

      const dataPoint = {
        indexes: [record.organizationId],
        blobs: [
          record.id,
          record.workflowId,
          record.deploymentId || "",
          record.status,
          (record.error || "").substring(0, 2000), // truncate to fit in blob
        ],
        doubles: [durationMs, startedAtMs, endedAtMs, usage],
      };

      try {
        this.env.EXECUTIONS.writeDataPoint(dataPoint);
      } catch (writeError) {
        console.error(
          `ExecutionStore.writeToAnalytics: writeDataPoint failed for ${record.id}:`,
          writeError,
          { dataPoint: JSON.stringify(dataPoint) }
        );
        throw writeError;
      }
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
  private async queryAnalytics(sql: string): Promise<AnalyticsRow[]> {
    // Validate required credentials
    if (!this.env.CLOUDFLARE_ACCOUNT_ID || !this.env.CLOUDFLARE_API_TOKEN) {
      console.error(
        `ExecutionStore.queryAnalytics: Missing credentials - CLOUDFLARE_ACCOUNT_ID: ${!!this.env.CLOUDFLARE_ACCOUNT_ID}, CLOUDFLARE_API_TOKEN: ${!!this.env.CLOUDFLARE_API_TOKEN}`
      );
      throw new Error(
        "Analytics Engine queries require CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to be configured. " +
          "In development: add to .dev.vars file. " +
          "In production: use 'wrangler secret put' to set these values."
      );
    }

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
        console.error(
          `ExecutionStore.queryAnalytics: HTTP ${response.status} - ${error}`
        );

        // Check for common permission issues
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Analytics Engine query authentication failed (${response.status}). ` +
              `Verify your API token has "Account Analytics: Read" permission. ` +
              `Error: ${error}`
          );
        }

        throw new Error(
          `Analytics query failed: ${response.statusText} - ${error}`
        );
      }

      const result = (await response.json()) as { data?: AnalyticsRow[] };
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
   * Convert WorkflowExecution data to ExecutionRow metadata
   */
  private executionDataToRow(
    executionData: WorkflowExecution,
    organizationId: string
  ): ExecutionRow {
    // Calculate usage from node executions
    const usage =
      executionData.nodeExecutions?.reduce(
        (sum, ne) => sum + (ne.usage ?? 0),
        0
      ) ?? 0;

    const now = new Date();

    return {
      id: executionData.id,
      workflowId: executionData.workflowId,
      deploymentId: executionData.deploymentId ?? null,
      organizationId,
      status: executionData.status,
      error: executionData.error ?? null,
      startedAt: executionData.startedAt ?? now,
      endedAt: executionData.endedAt ?? now,
      createdAt: now,
      updatedAt: now,
      usage,
    };
  }

  /**
   * List executions from Analytics Engine (use Analytics Engine for querying/filtering)
   */
  private async listFromAnalytics(
    organizationId: string,
    options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]> {
    try {
      const dataset = this.getDatasetName();

      const whereConditions = [`index1 = '${organizationId}'`];

      if (options?.workflowId) {
        whereConditions.push(`blob2 = '${options.workflowId}'`);
      }

      if (options?.deploymentId) {
        whereConditions.push(`blob3 = '${options.deploymentId}'`);
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

      return rows.map((row) => {
        const timestamp = new Date(row.timestamp);

        // Read timestamps from doubles array (stored as epoch milliseconds)
        const startedAt = row.double2 ? new Date(row.double2) : timestamp;
        const endedAt = row.double3 ? new Date(row.double3) : timestamp;

        return {
          id: row.blob1,
          workflowId: row.blob2,
          deploymentId: row.blob3 || null,
          organizationId: row.index1,
          status: row.blob4 as WorkflowExecutionStatus,
          error: row.blob5 || null,
          startedAt,
          endedAt,
          createdAt: timestamp,
          updatedAt: timestamp,
          usage: row.double4 ?? 0,
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
  private async writeToR2(
    execution: WorkflowExecution,
    organizationId: string
  ): Promise<void> {
    try {
      if (!this.env.RESSOURCES) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${execution.id}/execution.json`;
      await this.env.RESSOURCES.put(key, JSON.stringify(execution), {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          organizationId, // Add organizationId for security
          workflowId: execution.workflowId,
          status: execution.status,
          updatedAt: new Date().toISOString(),
        },
      });
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
  private async readFromR2(
    executionId: string,
    organizationId: string
  ): Promise<WorkflowExecution> {
    try {
      if (!this.env.RESSOURCES) {
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/execution.json`;
      const object = await this.env.RESSOURCES.get(key);

      if (!object) {
        throw new Error(`Execution not found: ${executionId}`);
      }

      // Verify organizationId matches for security
      const storedOrgId = object.customMetadata?.organizationId;
      if (storedOrgId && storedOrgId !== organizationId) {
        throw new Error(
          `Access denied: execution ${executionId} does not belong to organization ${organizationId}`
        );
      }

      const text = await object.text();
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
