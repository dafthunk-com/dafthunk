import { WorkflowExecution, WorkflowExecutionStatus } from "@dafthunk/types";

import { Bindings } from "../context";

interface R2SQLRow {
  id: string;
  organization_id: string;
  workflow_id: string;
  workflow_name: string | null;
  deployment_id: string | null;
  status: string;
  data: string;
  started_at: string;
  ended_at: string;
  duration: number;
}

interface R2SQLResponse {
  result: {
    rows: R2SQLRow[];
  };
}

export class ExecutionStore {
  private env: Bindings;

  constructor(env: Bindings) {
    this.env = env;
  }

  /**
   * Logs execution data to Cloudflare pipeline for analytics and monitoring.
   * Maps D1 database columns 1-1 to pipeline schema fields.
   */
  async logExecution(
    organizationId: string,
    execution: WorkflowExecution
  ): Promise<void> {
    try {
      // Calculate duration in milliseconds
      const duration =
        execution.endedAt && execution.startedAt
          ? execution.endedAt.getTime() - execution.startedAt.getTime()
          : 0;

      // Create pipeline data
      const pipelineData = {
        id: execution.id,
        organization_id: organizationId,
        workflow_id: execution.workflowId,
        workflow_name: execution.workflowName || null,
        deployment_id: execution.deploymentId || null,
        status: execution.status,
        data: execution,
        started_at: execution.startedAt?.getTime() || 0,
        ended_at: execution.endedAt?.getTime() || 0,
        duration: duration,
      };

      // Send to pipeline
      await this.env.DAFTHUNK_EXECUTIONS_STREAM.send([pipelineData]);

      console.log(`Execution logged to pipeline: ${execution.id}`);
    } catch (error) {
      // Log pipeline errors but don't fail the workflow execution
      console.error("Failed to log execution to pipeline:", error);
    }
  }

  async listExecutions(
    organizationId: string,
    limit: number = 10
  ): Promise<WorkflowExecution[]> {
    if (!this.env.CLOUDFLARE_ACCOUNT_ID || !this.env.CLOUDFLARE_API_TOKEN) {
      throw new Error("R2 SQL API not configured");
    }

    const query = `
            SELECT * 
            FROM default.executions 
            WHERE organization_id = '${organizationId}'
            LIMIT ${limit};
        `;

    const url = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/r2-sql/query/dafthunk-events-production`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "R2 SQL API error:",
        response.status,
        response.statusText,
        errorText
      );
      throw new Error(`Failed to fetch execution analytics: ${errorText}`);
    }

    const data = (await response.json()) as R2SQLResponse;

    // Transform the data to match WorkflowExecution format
    return data.result.rows.map((row) => {
      let parsedData;
      try {
        parsedData = JSON.parse(row.data);
      } catch (error) {
        console.warn(`Failed to parse data for execution ${row.id}:`, error);
        parsedData = null;
      }

      return {
        id: row.id,
        workflowId: row.workflow_id,
        workflowName: row.workflow_name || "Unknown Workflow",
        deploymentId: row.deployment_id || undefined,
        status: row.status as WorkflowExecutionStatus,
        nodeExecutions: parsedData?.nodeExecutions || [],
        error: parsedData?.error || undefined,
        visibility: parsedData?.visibility || "private",
        startedAt: new Date(row.started_at),
        endedAt: new Date(row.ended_at),
      };
    });
  }
}
