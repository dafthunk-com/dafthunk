import { Bindings } from "./context";
import { ExecutionContext } from "@cloudflare/workers-types";
import {
  getDeploymentByWorkflowIdAndVersion,
  getDeploymentByWorkflowIdOrHandleAndVersion,
  getLatestDeploymentByWorkflowId,
  getLatestDeploymentByWorkflowIdOrHandle,
  getOrganizationById,
  getWorkflowById,
  getWorkflowByIdOrHandle,
  saveExecution,
} from "./utils/db";
import { ExecutionStatus } from "./db/schema";
import { createDatabase } from "./db";
import { simpleParser } from 'mailparser';

import { Node, Workflow as WorkflowType } from "@dafthunk/types";

async function streamToString(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  // eslint-disable-next-line no-constant-condition
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

  const rawEmail = await streamToString(raw);
  const parsedEmail = await simpleParser(rawEmail);


  // Extract the handle from the to address
  const handle = to.split("@")[0];
  const workflowId = handle.split(".")[0];
  const version = handle.split(".")[1];

  const db = createDatabase(env.DB);

  // Get workflow data either from deployment or directly from workflow
  let workflowData: WorkflowType;
  let workflow: any;
  let deploymentId: string | undefined;

  if (version === "dev") {
    // Get workflow data directly
    workflow = await getWorkflowById(db, workflowId);
    if (!workflow) {
      console.error("Workflow not found");
      return;
    }
    workflowData = workflow.data as WorkflowType;
  } else {
    // Get deployment based on version
    let deployment;
    if (version === "latest") {
      deployment = await getLatestDeploymentByWorkflowId(db, workflowId);
      if (!deployment) {
        console.error("Deployment not found");
        return;
      }
    } else {
      deployment = await getDeploymentByWorkflowIdAndVersion(
        db,
        workflowId,
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
    };
  }

  // Validate if workflow has nodes
  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      "Cannot execute an empty workflow. Please add nodes to the workflow."
    );
    return;
  }

  // Trigger the runtime and get the instance id
  const instance = await env.EXECUTE.create({
    params: {
      userId: "email",
      organizationId: workflow.organizationId,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
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
    visibility: "private",
    nodeExecutions,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
