import { ExecutionContext } from "@cloudflare/workers-types";
import { Node, Workflow as WorkflowType } from "@dafthunk/types";
import CronParser from "cron-parser";

import { Bindings } from "./context";
import { createDatabase, ExecutionStatusType } from "./db";
import {
  getDueCronTriggers,
  getOrganizationComputeCredits,
  saveExecution,
  updateCronTriggerRunTimes,
} from "./db/queries";

// This function will now handle the actual execution triggering and initial record saving
async function executeWorkflow(
  workflowInfo: {
    id: string;
    name: string;
    handle: string;
    organizationId: string;
  },
  workflowData: WorkflowType,
  deploymentId: string | undefined,
  db: ReturnType<typeof createDatabase>,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  console.log(`Attempting to execute workflow ${workflowInfo.id} via cron.`);

  try {
    // Get organization compute credits
    const computeCredits = await getOrganizationComputeCredits(
      db,
      workflowInfo.organizationId
    );
    if (computeCredits === undefined) {
      console.error("Organization not found");
      return;
    }

    const executionInstance = await env.EXECUTE.create({
      params: {
        userId: "cron_trigger",
        organizationId: workflowInfo.organizationId,
        computeCredits,
        workflow: {
          id: workflowInfo.id,
          name: workflowData.name,
          handle: workflowInfo.handle,
          type: workflowData.type,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
        monitorProgress: false,
        deploymentId: deploymentId,
      },
    });

    const executionId = executionInstance.id;
    console.log(
      `Workflow ${workflowInfo.id} started with execution ID: ${executionId}`
    );

    const nodeExecutions = workflowData.nodes.map((node: Node) => ({
      nodeId: node.id,
      status: "idle" as const,
    }));

    await saveExecution(db, {
      id: executionId,
      workflowId: workflowInfo.id,
      deploymentId: deploymentId,
      userId: "cron_trigger",
      organizationId: workflowInfo.organizationId,
      status: "executing" as ExecutionStatusType,
      nodeExecutions,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
    });
    console.log(`Initial execution record saved for ${executionId}`);
  } catch (execError) {
    console.error(
      `Error executing workflow ${workflowInfo.id} or saving initial record:`,
      execError
    );
  }
}

export async function handleCronTriggers(
  event: ScheduledEvent,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Cron event triggered at: ${new Date(event.scheduledTime)}`);
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
      const { cronTrigger, workflow, deployment } = item;
      const { versionAlias, workflowId } = cronTrigger;

      console.log(
        `Processing trigger for workflow: ${workflowId} with version alias: ${versionAlias}`
      );

      let workflowToExecute: WorkflowType | null = null;
      let deploymentIdToExecute: string | undefined = undefined;

      try {
        if (versionAlias === "dev") {
          workflowToExecute = workflow.data;
        } else if (deployment) {
          workflowToExecute = deployment.workflowData;
          deploymentIdToExecute = deployment.id;
        } else {
          console.error(
            `Could not find a valid deployment for workflow ${workflowId} with version alias '${versionAlias}'.`
          );
          continue;
        }

        if (workflowToExecute) {
          const workflowInfo = {
            id: workflow.id,
            name: workflow.name,
            handle: workflow.handle,
            organizationId: workflow.organizationId,
          };

          await executeWorkflow(
            workflowInfo,
            workflowToExecute,
            deploymentIdToExecute,
            db,
            env,
            ctx
          );
        } else {
          // This case should ideally not be reached due to the checks above,
          // but is kept as a safeguard.
          console.log(
            `No workflow data found to execute for trigger with workflowId: ${workflowId}`
          );
          continue;
        }

        const interval = CronParser.parse(cronTrigger.cronExpression, {
          currentDate: cronTrigger.lastRun || now,
        });
        const nextRun = interval.next().toDate();

        await updateCronTriggerRunTimes(
          db,
          cronTrigger.workflowId,
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
      }
    }
  } catch (dbError) {
    console.error("Database error during scheduled task:", dbError);
  }
}
