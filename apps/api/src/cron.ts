import {
  ExecutionStatusType,
  Node,
  Workflow as WorkflowType,
} from "@dafthunk/types";
import CronParser from "cron-parser";

import { Bindings } from "./context";
import { createDatabase } from "./db";
import {
  getDueCronTriggers,
  getOrganizationComputeCredits,
  updateCronTriggerRunTimes,
} from "./db/queries";
import { DeploymentStore } from "./stores/deployment-store";
import { ExecutionStore } from "./stores/execution-store";
import { WorkflowStore } from "./stores/workflow-store";

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
  _ctx: ExecutionContext,
  executionStore: ExecutionStore
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

    await executionStore.save({
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
  const executionStore = new ExecutionStore(env);
  const workflowStore = new WorkflowStore(env);
  const deploymentStore = new DeploymentStore(env);
  const now = new Date();

  try {
    const dueTriggers = await getDueCronTriggers(db, now);

    if (dueTriggers.length === 0) {
      console.log("No due cron triggers found.");
      return;
    }

    console.log(`Found ${dueTriggers.length} due cron triggers.`);

    for (const item of dueTriggers) {
      const { cronTrigger, workflow } = item;

      console.log(
        `Processing trigger for workflow: ${workflow.id} (${workflow.activeDeploymentId ? "prod" : "dev"} mode)`
      );

      try {
        // Simple 2-path model: use activeDeploymentId to determine dev vs prod
        let workflowToExecute: WorkflowType | null = null;
        let deploymentIdToExecute: string | undefined = undefined;

        if (workflow.activeDeploymentId) {
          // PROD PATH: Load from active deployment
          try {
            workflowToExecute = await deploymentStore.readWorkflowSnapshot(
              workflow.activeDeploymentId
            );
            deploymentIdToExecute = workflow.activeDeploymentId;
          } catch (error) {
            console.error(
              `Failed to load active deployment ${workflow.activeDeploymentId} for workflow ${workflow.id}:`,
              error
            );
            continue;
          }
        } else {
          // DEV PATH: Load from working version
          try {
            const workflowWithData = await workflowStore.getWithData(
              workflow.id,
              workflow.organizationId
            );
            if (!workflowWithData) {
              console.error(
                `Failed to load workflow data for ${workflow.id}: not found`
              );
              continue;
            }
            workflowToExecute = workflowWithData.data;
          } catch (error) {
            console.error(
              `Failed to load workflow data from R2 for ${workflow.id}:`,
              error
            );
            continue;
          }
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
            ctx,
            executionStore
          );
        }

        // Calculate next run time and update trigger
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
          `Workflow ${workflow.id} processing initiated. Next run at: ${nextRun.toISOString()}`
        );
      } catch (err) {
        console.error(
          `Error processing trigger for workflow ${workflow.id}:`,
          err
        );
      }
    }
  } catch (dbError) {
    console.error("Database error during scheduled task:", dbError);
  }
}
