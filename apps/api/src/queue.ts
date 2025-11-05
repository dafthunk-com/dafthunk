import {
  ExecutionStatusType,
  Node,
  QueueMessage,
  Workflow as WorkflowType,
} from "@dafthunk/types";

import { Bindings } from "./context";
import { createDatabase } from "./db";
import {
  getOrganizationComputeCredits,
  getQueueTriggersByQueue,
} from "./db/queries";
import { DeploymentStore } from "./stores/deployment-store";
import { ExecutionStore } from "./stores/execution-store";
import { WorkflowStore } from "./stores/workflow-store";

// This function handles the actual execution triggering and initial record saving
async function executeWorkflow(
  workflowInfo: {
    id: string;
    name: string;
    handle: string;
    organizationId: string;
  },
  workflowData: WorkflowType,
  deploymentId: string | undefined,
  queueMessage: QueueMessage,
  db: ReturnType<typeof createDatabase>,
  env: Bindings,
  _ctx: ExecutionContext,
  executionStore: ExecutionStore
): Promise<void> {
  console.log(
    `Attempting to execute workflow ${workflowInfo.id} via queue message.`
  );

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
        userId: "queue_trigger",
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
        queueMessage: {
          queueId: queueMessage.queueId,
          organizationId: queueMessage.organizationId,
          payload: queueMessage.payload,
          timestamp: queueMessage.timestamp,
          mode: queueMessage.mode,
        },
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
      userId: "queue_trigger",
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

export async function handleQueueMessages(
  batch: MessageBatch,
  env: Bindings,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Queue batch received with ${batch.messages.length} messages`);
  const db = createDatabase(env.DB);
  const executionStore = new ExecutionStore(env);
  const workflowStore = new WorkflowStore(env);
  const deploymentStore = new DeploymentStore(env);

  try {
    for (const message of batch.messages) {
      try {
        // Parse the message body
        const queueMessage = message.body as QueueMessage;

        console.log(
          `Processing message for queue: ${queueMessage.queueId}, org: ${queueMessage.organizationId}`
        );

        // Get all active queue triggers for this queue
        const triggers = await getQueueTriggersByQueue(
          db,
          queueMessage.queueId,
          queueMessage.organizationId
        );

        if (triggers.length === 0) {
          console.log(
            `No active triggers found for queue ${queueMessage.queueId}`
          );
          message.ack();
          continue;
        }

        console.log(`Found ${triggers.length} active triggers for this queue.`);

        // Deduplicate workflows by (workflowId + deploymentPath) to avoid loading same workflow multiple times
        const workflowCache = new Map<
          string,
          {
            data: WorkflowType;
            deploymentId: string | undefined;
            workflow: (typeof triggers)[0]["workflow"];
          }
        >();

        // Determine mode from queue message (defaults to 'prod' for backward compatibility)
        const isDevMode = queueMessage.mode === 'dev';

        // Load each unique workflow once
        for (const item of triggers) {
          const { workflow } = item;
          const cacheKey = `${workflow.id}:${workflow.activeDeploymentId || "dev"}`;

          if (workflowCache.has(cacheKey)) {
            continue; // Already loaded this workflow
          }

          console.log(
            `Loading workflow: ${workflow.id} (message mode: ${queueMessage.mode || 'prod'}, workflow has deployment: ${!!workflow.activeDeploymentId})`
          );

          try {
            let workflowToExecute: WorkflowType | null = null;
            let deploymentIdToExecute: string | undefined = undefined;

            if (isDevMode) {
              // DEV MODE: Only trigger workflows WITHOUT active deployment
              if (workflow.activeDeploymentId) {
                console.log(
                  `Skipping workflow ${workflow.id}: dev message but workflow has active deployment`
                );
                continue;
              }

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
            } else {
              // PROD MODE: Only trigger workflows WITH active deployment
              if (!workflow.activeDeploymentId) {
                console.log(
                  `Skipping workflow ${workflow.id}: prod message but workflow has no active deployment`
                );
                continue;
              }

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
            }

            if (workflowToExecute) {
              workflowCache.set(cacheKey, {
                data: workflowToExecute,
                deploymentId: deploymentIdToExecute,
                workflow,
              });
            }
          } catch (err) {
            console.error(`Error loading workflow ${workflow.id}:`, err);
          }
        }

        // Execute each trigger with its corresponding workflow
        for (const item of triggers) {
          const { workflow } = item;
          const cacheKey = `${workflow.id}:${workflow.activeDeploymentId || "dev"}`;
          const cached = workflowCache.get(cacheKey);

          if (!cached) {
            console.log(
              `Skipping trigger for workflow ${workflow.id}: failed to load`
            );
            continue;
          }

          console.log(`Executing trigger for workflow: ${workflow.id}`);

          try {
            const workflowInfo = {
              id: workflow.id,
              name: workflow.name,
              handle: workflow.handle,
              organizationId: workflow.organizationId,
            };

            await executeWorkflow(
              workflowInfo,
              cached.data,
              cached.deploymentId,
              queueMessage,
              db,
              env,
              ctx,
              executionStore
            );
          } catch (err) {
            console.error(`Error executing workflow ${workflow.id}:`, err);
          }
        }

        // Acknowledge the message after processing all triggers
        message.ack();
        console.log(`Message acknowledged for queue ${queueMessage.queueId}`);
      } catch (messageError) {
        console.error("Error processing queue message:", messageError);
        // Retry the message by not acknowledging it
        message.retry();
      }
    }
  } catch (batchError) {
    console.error("Error processing queue batch:", batchError);
  }
}
