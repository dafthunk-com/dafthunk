import type { Workflow } from "@dafthunk/types";

import type { Bindings } from "./context";
import { createDatabase, getOrganizationComputeCredits } from "./db";
import { createWorkerRuntime } from "./runtime/cloudflare-worker-runtime";
import { DeploymentStore } from "./stores/deployment-store";
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

  // Support 2 or 3 parts: org+inbox or org+inbox+dev
  if (parts.length < 2 || parts.length > 3) {
    console.error(
      `Invalid email format: ${to}. Expected <organizationIdOrHandle>+<emailIdOrHandle>[+dev]@domain.com`
    );
    return;
  }

  const [organizationIdOrHandle, emailIdOrHandle, devFlag] = parts;
  const isDevMode = devFlag === "dev";

  console.log(
    `Processing email trigger for email inbox: ${emailIdOrHandle}${isDevMode ? " (dev mode)" : ""}`
  );

  const db = createDatabase(env.DB);
  const workflowStore = new WorkflowStore(env);
  const deploymentStore = new DeploymentStore(env);

  // Get email inbox
  const { getEmail, getEmailTriggersByEmail } = await import("./db");
  const email = await getEmail(db, emailIdOrHandle, organizationIdOrHandle);
  if (!email) {
    console.error(
      `Email inbox '${emailIdOrHandle}' not found or does not belong to organization '${organizationIdOrHandle}'`
    );
    return;
  }

  // Get organization ID from the email record
  const organizationId = email.organizationId;

  // Get all workflows triggered by this email
  const emailTriggersWithWorkflows = await getEmailTriggersByEmail(
    db,
    email.id,
    organizationId
  );

  if (emailTriggersWithWorkflows.length === 0) {
    console.log(
      `No active workflows found for email inbox: ${emailIdOrHandle}`
    );
    return;
  }

  console.log(
    `Found ${emailTriggersWithWorkflows.length} workflow(s) to trigger for email inbox ${emailIdOrHandle}`
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
        deploymentStore,
        from,
        to,
        headers: headersRecord,
        rawContent,
        isDevMode,
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
  deploymentStore,
  from,
  to,
  headers,
  rawContent,
  isDevMode = false,
}: {
  workflow: any;
  email: any;
  organizationId: string;
  env: Bindings;
  workflowStore: WorkflowStore;
  deploymentStore: DeploymentStore;
  from: string;
  to: string;
  headers: Record<string, string>;
  rawContent: string;
  isDevMode?: boolean;
}): Promise<void> {
  const db = createDatabase(env.DB);

  let workflowData: Workflow;
  let deploymentId: string | undefined;

  if (isDevMode) {
    // DEV PATH: Always use working version when +dev suffix is used
    console.log(`Loading workflow in dev mode (explicit)`);
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
  } else {
    // PROD PATH: Only trigger if workflow has an active deployment
    if (!workflow.activeDeploymentId) {
      console.log(
        `Discarding email for workflow ${workflow.id}: no active deployment (production address requires deployed workflow)`
      );
      return;
    }

    console.log(`Loading workflow in prod mode`);
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
    organizationId
  );
  if (computeCredits === undefined) {
    console.error("Organization not found");
    return;
  }

  const executionParams = {
    userId: "email_trigger",
    organizationId,
    computeCredits,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      handle: workflow.handle,
      trigger: workflow.trigger,
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    deploymentId,
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
    const executionInstance = await env.EXECUTE.create({
      params: executionParams,
    });
    console.log(
      `[Execution] ${executionInstance.id} workflow=${workflow.id} runtime=workflow trigger=email`
    );
  }
}
