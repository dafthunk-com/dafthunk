import { EmailMessage } from "../nodes/types";

export interface SimulateEmailParams {
  from?: string;
  subject?: string;
  body?: string;
  organizationId: string;
  workflowHandleOrId: string;
}

/**
 * Creates a simulated EmailMessage for testing and UI-triggered email workflows.
 * This matches the format expected by email nodes and mimics real email structure.
 */
export function createSimulatedEmailMessage(
  params: SimulateEmailParams
): EmailMessage {
  const emailFrom = params.from || "sender@example.com";
  const emailSubject = params.subject || "Default Subject";
  const emailBody = params.body || "Default email body.";
  const emailTo = `workflow+${params.organizationId}+${params.workflowHandleOrId}@dafthunk.com`;

  const messageId = `<${crypto.randomUUID()}@dafthunk.com>`;
  const currentDate = new Date().toUTCString();

  const simulatedHeaders = {
    from: emailFrom,
    to: emailTo,
    subject: emailSubject,
    "content-type": "text/plain; charset=us-ascii",
    date: currentDate,
    "message-id": messageId,
  };

  const simulatedRaw =
    `Received: from [127.0.0.1] (localhost [127.0.0.1])\n` +
    `by dafthunk.com (Postfix) with ESMTP id FAKEIDFORTEST\n` +
    `for <${emailTo}>; ${currentDate}\n` +
    `From: ${emailFrom}\n` +
    `To: ${emailTo}\n` +
    `Subject: ${emailSubject}\n` +
    `Date: ${currentDate}\n` +
    `Message-ID: ${messageId}\n` +
    `Content-Type: text/plain; charset=us-ascii\n` +
    `Content-Transfer-Encoding: 7bit\n\n` +
    `${emailBody}`;

  return {
    from: emailFrom,
    to: emailTo,
    headers: simulatedHeaders,
    raw: simulatedRaw,
  };
}
