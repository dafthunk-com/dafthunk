import {
  ExecutionStatus,
  Node,
  Workflow as WorkflowType,
} from "@dafthunk/types";

import { Bindings } from "./context";
import { createDatabase, getOrganizationComputeCredits } from "./db";
import { DeploymentStore } from "./stores/deployment-store";
import { ExecutionStore } from "./stores/execution-store";
import { WorkflowStore } from "./stores/workflow-store";

async function streamToString(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // Flush any remaining bytes
  return result;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    record[key] = value;
  }
  return record;
}

export async function handleIncomingEmail(
  message: ForwardableEmailMessage,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> {
  const { from, to, headers, raw } = message;

  // Extract the handle from the to address
  const localPart = to.split("@")[0];
  const parts = localPart.split("+");

  if (parts.length !== 3) {
    console.error(
      `Invalid email format: ${to}. Expected <type>+<organizationIdOrHandle>+<workflowIdOrHandle>@domain.com`
    );
    return;
  }

  const [triggerType, organizationIdOrHandle, workflowIdOrHandle] = parts;

  if (triggerType !== "workflow") {
    console.error(`Invalid trigger type: ${triggerType}. Expected "workflow".`);
    return;
  }

  console.log(`Processing email trigger for workflow: ${workflowIdOrHandle}`);

  const db = createDatabase(env.DB);
  const executionStore = new ExecutionStore(env);
  const workflowStore = new WorkflowStore(env);
  const deploymentStore = new DeploymentStore(env);

  // Get workflow metadata
  const workflow = await workflowStore.get(
    workflowIdOrHandle,
    organizationIdOrHandle
  );
  if (!workflow) {
    console.error(
      `Workflow '${workflowIdOrHandle}' not found or does not belong to organization '${organizationIdOrHandle}'`
    );
    return;
  }

  console.log(
    `Loading workflow in ${workflow.activeDeploymentId ? "prod" : "dev"} mode`
  );

  // Simple 2-path model: use activeDeploymentId to determine dev vs prod
  let workflowData: WorkflowType;
  let deploymentId: string | undefined;

  if (workflow.activeDeploymentId) {
    // PROD PATH: Load from active deployment
    try {
      workflowData = await deploymentStore.readWorkflowSnapshot(
        workflow.activeDeploymentId
      );
      deploymentId = workflow.activeDeploymentId;
    } catch (error) {
      console.error(
        `Failed to load active deployment ${workflow.activeDeploymentId} for workflow ${workflow.id}:`,
        error
      );
      return;
    }
  } else {
    // DEV PATH: Load from working version
    try {
      const workflowWithData = await workflowStore.getWithData(
        workflow.id,
        organizationIdOrHandle
      );
      if (!workflowWithData || !workflowWithData.data) {
        console.error(`Failed to load workflow data for ${workflow.id}`);
        return;
      }
      workflowData = workflowWithData.data;
    } catch (error) {
      console.error(
        `Failed to load workflow data from R2 for ${workflow.id}:`,
        error
      );
      return;
    }
  }

  // Validate if workflow has nodes
  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      "Cannot execute an empty workflow. Please add nodes to the workflow."
    );
    return;
  }

  // Get organization compute credits
  const computeCredits = await getOrganizationComputeCredits(
    db,
    workflow.organizationId
  );
  if (computeCredits === undefined) {
    console.error("Organization not found");
    return;
  }

  // Trigger the runtime and get the instance id
  const instance = await env.EXECUTE.create({
    params: {
      userId: "email",
      organizationId: workflow.organizationId,
      computeCredits,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        type: workflow.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      deploymentId,
      emailMessage: {
        from,
        to,
        headers: headersToRecord(headers),
        raw: await streamToString(raw),
      },
    },
  });
  const executionId = instance.id;

  // Build initial nodeExecutions (all idle)
  const nodeExecutions = workflowData.nodes.map((node: Node) => ({
    nodeId: node.id,
    status: "idle" as const,
  }));

  // Save initial execution record
  await executionStore.save({
    id: executionId,
    workflowId: workflow.id,
    deploymentId,
    userId: "email",
    organizationId: workflow.organizationId,
    status: ExecutionStatus.EXECUTING,
    nodeExecutions,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
