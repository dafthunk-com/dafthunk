import { createDatabase, executions } from "../db";
import { WorkflowExecution } from "@dafthunk/types";
import { ExecutionStatusType } from "../db/schema";

export type SaveExecutionRecord = {
  id: string;
  workflowId: string;
  userId: string;
  status: ExecutionStatusType;
  nodeExecutions: any[];
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function saveExecutionRecord(
  db: ReturnType<typeof createDatabase>,
  record: SaveExecutionRecord
): Promise<WorkflowExecution> {
  const now = new Date();
  const { nodeExecutions, ...rest } = record;
  const executionData = {
    ...rest,
    data: JSON.stringify({ nodeExecutions }),
    updatedAt: record.updatedAt ?? now,
    createdAt: record.createdAt ?? now,
  };

  await db
    .insert(executions)
    .values(executionData)
    .onConflictDoUpdate({ target: executions.id, set: executionData });

  return {
    ...rest,
    nodeExecutions,
    error: record.error,
  };
}
