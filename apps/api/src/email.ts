import type { Workflow } from "@dafthunk/types";

import type { Bindings } from "./context";
import {
  createDatabase,
  getOrganizationBillingInfo,
  resolveOrganizationBillingOptions,
} from "./db";
import { getAgentByName } from "./durable-objects/agent-utils";
import { createWorkerRuntime } from "./runtime/cloudflare-worker-runtime";
import { WorkflowStore } from "./stores/workflow-store";
import { handleSupportEmail } from "./support-email";

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
  ctx: ExecutionContext
): Promise<void> {
  const { from, to, headers, raw } = message;

  // Lowercase defensively — MTAs may case-fold local parts in transit.
  const localPart = to.split("@")[0]?.toLowerCase();

  if (!localPart) {
    console.error(`Invalid email format: ${to}. Expected <handle>@domain.com`);
    return;
  }

  const plusIdx = localPart.indexOf("+");
  const handle = plusIdx === -1 ? localPart : localPart.slice(0, plusIdx);
  const subaddress = plusIdx === -1 ? null : localPart.slice(plusIdx + 1);

  // Reserved global address (e.g. support@) routes to the admin inbox path
  // instead of the per-org workflow-trigger lookup. Configured via
  // SUPPORT_EMAIL_HANDLE so we can move it without code changes.
  const supportHandle = env.SUPPORT_EMAIL_HANDLE?.toLowerCase();
  if (supportHandle && handle === supportHandle) {
    return handleSupportEmail(message, env, ctx, subaddress);
  }

  console.log(`Processing email trigger for handle: ${handle}`);

  const db = createDatabase(env.DB);
  const workflowStore = new WorkflowStore(env);

  const { getEmailByHandle, getEmailTriggersByEmail } = await import("./db");
  const email = await getEmailByHandle(db, handle);
  if (!email) {
    console.error(`Email '${handle}' not found`);
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
    console.log(`No active workflows found for email: ${handle}`);
    return;
  }

  console.log(
    `Found ${emailTriggersWithWorkflows.length} workflow(s) to trigger for email ${handle}`
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
    ...resolveOrganizationBillingOptions(billingInfo, env.CLOUDFLARE_ENV),
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
