import CronParser from "cron-parser"; // Or your chosen cron library
import { drizzle } from "drizzle-orm/d1";
import { Node, Workflow as WorkflowType } from "@dafthunk/types"; // Using Workflow as WorkflowType from types
import { ExecutionContext } from "@cloudflare/workers-types";

import * as schema from "./db/schema";
import { WorkflowRow } from "./db/schema";
import { getDueCronTriggers, updateCronTriggerRunTimes, saveExecution } from "./db/queries";
import { createDatabase, ExecutionStatusType } from "./db"; // Added ExecutionStatusType
import { Bindings } from "./context"; // For the full env type

// This function will now handle the actual execution triggering and initial record saving
async function executeWorkflow(
  workflowRow: WorkflowRow,
  db: ReturnType<typeof createDatabase>,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  console.log(`Attempting to execute workflow ${workflowRow.id} via cron.`);

  // Assuming workflowRow.data is of type WorkflowType from @dafthunk/types
  // which includes type, nodes, and edges.
  const workflowData: WorkflowType = workflowRow.data;

  try {
    const executionInstance = await env.EXECUTE.create({
      params: {
        userId: "cron_trigger",
        organizationId: workflowRow.organizationId,
        workflow: {
          id: workflowRow.id,
          name: workflowRow.name,
          handle: workflowRow.handle,
          type: workflowData.type, // Reinstated: type from workflow data
          nodes: workflowData.nodes, // Reinstated: nodes from workflow data
          edges: workflowData.edges, // Reinstated: edges from workflow data
        },
        monitorProgress: false,
        deploymentId: undefined,
      },
    });

    const executionId = executionInstance.id;
    console.log(`Workflow ${workflowRow.id} started with execution ID: ${executionId}`);

    const nodeExecutions = workflowData.nodes.map((node: Node) => ({
      nodeId: node.id,
      status: "idle" as const,
    }));

    await saveExecution(db, {
      id: executionId,
      workflowId: workflowRow.id,
      deploymentId: undefined,
      userId: "cron_trigger",
      organizationId: workflowRow.organizationId,
      status: "executing" as ExecutionStatusType,
      visibility: "private",
      nodeExecutions,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
    });
    console.log(`Initial execution record saved for ${executionId}`);

  } catch (execError) {
    console.error(`Error executing workflow ${workflowRow.id} or saving initial record:`, execError);
  }
}

export async function handleCronTriggers(
  event: ScheduledEvent,
  env: Bindings, // Updated to use the full Bindings type
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Cron event triggered at: ${new Date(event.scheduledTime)}`);
  // Ensure db is initialized correctly if createDatabase is the standard way
  // drizzle can also be initialized with just env.DB and schema
  const db = createDatabase(env.DB); 

  const now = new Date();

  try {
    const dueTriggers = await getDueCronTriggers(db, now);

    if (dueTriggers.length === 0) {
      console.log("No due cron triggers found.");
      return;
    }

    console.log(`Found ${dueTriggers.length} due cron triggers.`);

    for (const item of dueTriggers) {
      // item contains { cronTrigger: CronTriggerRow, workflow: WorkflowRow }
      console.log(`Processing trigger for workflow: ${item.workflow.id}`);
      try {
        // 1. Execute the workflow (asynchronously, no await here if we don't wait for termination)
        // However, executeWorkflow itself is async due to EXECUTE.create and saveExecution.
        // We should await it to ensure the initial saveExecution completes before updating run times.
        await executeWorkflow(item.workflow, db, env, ctx);

        // 2. Calculate next run time
        const interval = CronParser.parse(item.cronTrigger.cronExpression, {
          currentDate: now,
        });
        const nextRun = interval.next().toDate();

        // 3. Update the trigger in the database
        await updateCronTriggerRunTimes(
          db,
          item.cronTrigger.workflowId,
          nextRun,
          now
        );

        console.log(
          `Workflow ${item.workflow.id} processing initiated. Next run at: ${nextRun.toISOString()}`
        );
      } catch (err) {
        console.error(
          `Error processing trigger for workflow ${item.workflow.id}:`,
          err
        );
        // Optionally, you might want to implement retry logic or disable the trigger after too many failures.
      }
    }
  } catch (dbError) {
    console.error("Database error during scheduled task:", dbError);
  }
}
