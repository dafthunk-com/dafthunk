import { Node, Workflow as WorkflowType } from "@dafthunk/types";

import { Bindings } from "./context";
import {
  createDatabase,
  getOrganizationComputeCredits,
  getWorkflow,
} from "./db";
import {
  ExecutionStatus,
  getDeploymentByVersion,
  getLatestDeployment,
  saveExecution,
} from "./db";

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

  if (parts.length < 3 || parts.length > 4) {
    console.error(
      `Invalid email format: ${to}. Expected <type>+<organizationIdOrHandle>+<workflowIdOrHandle>[+<version>]@domain.com`
    );
    return;
  }

  const [
    triggerType,
    organizationIdOrHandle,
    workflowIdOrHandle,
    deploymentVersion,
  ] = parts;
  const version = deploymentVersion || "latest";

  if (triggerType !== "workflow") {
    console.error(`Invalid trigger type: ${triggerType}. Expected "workflow".`);
    return;
  }

  // TODO: Use triggerType if needed in the future. For now, it's parsed but not used.
  console.log(`Parsed trigger type: ${triggerType}`);

  const db = createDatabase(env.DB);

  // Get workflow data either from deployment or directly from workflow
  let workflowData: WorkflowType;
  let workflow: any;
  let deploymentId: string | undefined;

  if (version === "dev") {
    // Get workflow data directly
    workflow = await getWorkflow(
      db,
      workflowIdOrHandle,
      organizationIdOrHandle
    );
    if (!workflow) {
      console.error("Workflow not found");
      return;
    }
    workflowData = workflow.data as WorkflowType;
  } else {
    // Get deployment based on version
    let deployment;
    if (version === "latest") {
      deployment = await getLatestDeployment(
        db,
        workflowIdOrHandle,
        organizationIdOrHandle
      );
      if (!deployment) {
        console.error("Deployment not found");
        return;
      }
    } else {
      deployment = await getDeploymentByVersion(
        db,
        workflowIdOrHandle,
        organizationIdOrHandle,
        version
      );
      if (!deployment) {
        console.error("Deployment not found");
        return;
      }
    }

    deploymentId = deployment.id;
    workflowData = deployment.workflowData as WorkflowType;
    workflow = {
      id: deployment.workflowId,
      name: workflowData.name,
      organizationId: deployment.organizationId,
    };
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
      monitorProgress: false,
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
  await saveExecution(db, {
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
