import type { Workflow } from "@dafthunk/types";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "./context";
import type { EmailRow } from "./db";
import {
  createDatabase,
  getEmailByHandle,
  getEmailTriggersByEmail,
  getOrganizationBillingInfo,
  resolveOrganizationBillingOptions,
} from "./db";
import { getAgentByName } from "./durable-objects/agent-utils";
import { parseAndStageEmail } from "./mailbox-staging";
import { createWorkerRuntime } from "./runtime/cloudflare-worker-runtime";
import { WorkflowStore } from "./stores/workflow-store";
import { handleSupportEmail, isAuthenticated } from "./support-email";
import { verifyReplyToken } from "./support-reply-token";
import { isCreditExhausted } from "./utils/credits";

async function streamToBytes(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
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

  // Drop clearly spoofed mail before persisting (mirrors the support path).
  if (!isAuthenticated(headers)) {
    console.warn(`[email] dropping unauthenticated message from ${from}`);
    return;
  }

  const db = createDatabase(env.DB);
  const workflowStore = new WorkflowStore(env);

  const email = await getEmailByHandle(db, handle);
  if (!email) {
    console.error(`Email '${handle}' not found`);
    return;
  }

  const organizationId = email.organizationId;

  // Read the raw stream once (it can only be consumed once) and persist the
  // message to the org's mailbox. This happens for EVERY inbound message —
  // even when no workflow is subscribed — so the mailbox is a complete record.
  const rawBytes = await streamToBytes(raw);
  const rawContent = new TextDecoder().decode(rawBytes);
  const headersRecord = headersToRecord(headers);

  const mailbox = await persistInboundEmail({
    env,
    email,
    organizationId,
    rawBytes,
    from,
    to,
    subaddress,
  });

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
        mailbox,
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

/**
 * Parse + stage the inbound message to R2 and index it in the org's Mailbox
 * Durable Object. Returns the thread/message ids so a triggered workflow can
 * thread replies and read history. Failures are logged, never thrown — a
 * persistence error must not bounce legitimate mail or block the trigger.
 */
async function persistInboundEmail({
  env,
  email,
  organizationId,
  rawBytes,
  from,
  to,
  subaddress,
}: {
  env: Bindings;
  email: EmailRow;
  organizationId: string;
  rawBytes: Uint8Array;
  from: string;
  to: string;
  subaddress: string | null;
}): Promise<{ threadId: string; messageId: string } | undefined> {
  try {
    const messageId = uuidv7();
    const staged = await parseAndStageEmail(
      env,
      rawBytes,
      email.id,
      messageId,
      {
        from,
        to,
      }
    );

    const verifiedThreadId =
      subaddress && env.JWT_SECRET
        ? await verifyReplyToken(subaddress, env.JWT_SECRET)
        : null;

    const stub = env.MAILBOX.get(
      env.MAILBOX.idFromName(`mailbox:${organizationId}`)
    );
    const result = await stub.ingestInbound({
      emailId: email.id,
      messageId,
      ...staged,
      verifiedThreadId,
    });
    return result;
  } catch (error) {
    console.error(
      `[email] failed to persist inbound message for ${email.handle}:`,
      error instanceof Error ? error.message : String(error)
    );
    return undefined;
  }
}

async function triggerWorkflowForEmail({
  workflow,
  email,
  organizationId,
  env,
  workflowStore,
  from,
  to,
  headers,
  rawContent,
  mailbox,
}: {
  workflow: any;
  email: EmailRow;
  organizationId: string;
  env: Bindings;
  workflowStore: WorkflowStore;
  from: string;
  to: string;
  headers: Record<string, string>;
  rawContent: string;
  mailbox: { threadId: string; messageId: string } | undefined;
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

  if (isCreditExhausted(billingInfo, env.CLOUDFLARE_ENV)) {
    console.log(
      `Discarding email for workflow ${workflow.id}: credits exhausted`
    );
    return;
  }

  const billingOptions = resolveOrganizationBillingOptions(
    billingInfo,
    env.CLOUDFLARE_ENV
  );

  const executionParams = {
    userId: "email_trigger",
    organizationId,
    ...billingOptions,
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
      emailId: email.id,
      ...(mailbox
        ? { threadId: mailbox.threadId, messageId: mailbox.messageId }
        : {}),
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
