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
          payload: queueMessage.payload,
          timestamp: queueMessage.timestamp,
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

        // Execute each subscribed workflow
        for (const item of triggers) {
          const { workflow } = item;

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
                queueMessage,
                db,
                env,
                ctx,
                executionStore
              );
            }
          } catch (err) {
            console.error(
              `Error processing trigger for workflow ${workflow.id}:`,
              err
            );
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
