import type { Workflow } from "@dafthunk/types";

import type { Bindings } from "./context";
import {
  createDatabase,
  getOrganizationBillingInfo,
  resolveOrganizationPlan,
} from "./db";
import { getAgentByName } from "./durable-objects/agent-utils";
import { createWorkerRuntime } from "./runtime/cloudflare-worker-runtime";
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

  // Extract email ID from the to address: emailId@domain.com
  const emailId = to.split("@")[0];

  if (!emailId) {
    console.error(`Invalid email format: ${to}. Expected <emailId>@domain.com`);
    return;
  }

  console.log(`Processing email trigger for email inbox: ${emailId}`);

  const db = createDatabase(env.DB);
  const workflowStore = new WorkflowStore(env);

  // Get email inbox (globally unique UUID, org derived from record)
  const { getEmailById, getEmailTriggersByEmail } = await import("./db");
  const email = await getEmailById(db, emailId);
  if (!email) {
    console.error(`Email inbox '${emailId}' not found`);
    return;
  }

  const organizationId = email.organizationId;

  // Get all workflows triggered by this email
  const emailTriggersWithWorkflows = await getEmailTriggersByEmail(
    db,
    email.id,
    organizationId
  );

  if (emailTriggersWithWorkflows.length === 0) {
    console.log(`No active workflows found for email inbox: ${emailId}`);
    return;
  }

  console.log(
    `Found ${emailTriggersWithWorkflows.length} workflow(s) to trigger for email inbox ${emailId}`
  );

  // Read raw email content once (stream can only be consumed once)
  const rawContent = await streamToString(raw);
  const headersRecord = headersToRecord(headers);

  // Process each workflow that listens to this email
  for (const { workflow } of emailTriggersWithWorkflows) {
    console.log(`Triggering workflow: ${workflow.id} (${workflow.name})`);

    try {
      await triggerWorkflowForEmail({
        workflow,
        email,
        organizationId,
        env,
        workflowStore,
        from,
        to,
        headers: headersRecord,
        rawContent,
      });
    } catch (error) {
      console.error(
        `Failed to trigger workflow ${workflow.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Continue with other workflows even if one fails
    }
  }
}

async function triggerWorkflowForEmail({
  workflow,
  email: _email,
  organizationId,
  env,
  workflowStore,
  from,
  to,
  headers,
  rawContent,
}: {
  workflow: any;
  email: any;
  organizationId: string;
  env: Bindings;
  workflowStore: WorkflowStore;
  from: string;
  to: string;
  headers: Record<string, string>;
  rawContent: string;
}): Promise<void> {
  const db = createDatabase(env.DB);

  let workflowData: Workflow;

  if (!workflow.enabled) {
    console.log(`Discarding email for workflow ${workflow.id}: not enabled`);
    return;
  }

  try {
    const workflowWithData = await workflowStore.getWithData(
      workflow.id,
      organizationId
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

  // Validate if workflow has nodes
  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      "Cannot execute an empty workflow. Please add nodes to the workflow."
    );
    return;
  }

  // Get organization billing info
  const billingInfo = await getOrganizationBillingInfo(db, organizationId);
  if (billingInfo === undefined) {
    console.error("Organization not found");
    return;
  }

  const executionParams = {
    userId: "email_trigger",
    organizationId,
    computeCredits: billingInfo.computeCredits,
    userPlan: resolveOrganizationPlan(billingInfo),
    workflow: {
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger,
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    emailMessage: {
      from,
      to,
      headers,
      raw: rawContent,
    },
  };

  // Use WorkerRuntime for "worker" runtime (synchronous execution)
  // Use Cloudflare Workflows for "workflow" runtime (durable execution, default)
  if (workflowData.runtime === "worker") {
    const workerRuntime = createWorkerRuntime(env);
    const execution = await workerRuntime.execute(executionParams);
    console.log(
      `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=email`
    );
  } else {
    const agent = await getAgentByName(env.WORKFLOW_AGENT, workflow.id);
    const executionId = await agent.executeWorkflow(executionParams);
    console.log(
      `[Execution] ${executionId} workflow=${workflow.id} runtime=workflow trigger=email`
    );
  }
}
