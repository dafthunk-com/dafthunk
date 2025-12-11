import { EmailMessage } from "../nodes/types";

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface SimulateEmailParams {
  from?: string;
  subject?: string;
  body?: string;
  attachments?: EmailAttachment[];
  organizationId: string;
  workflowHandleOrId: string;
}

/**
 * Creates a simulated EmailMessage for testing and UI-triggered email workflows.
 * This matches the format expected by email nodes and mimics real email structure.
 * When attachments are provided, generates a MIME multipart/mixed message.
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

  const hasAttachments = params.attachments && params.attachments.length > 0;

  if (hasAttachments) {
    return createMultipartEmail({
      from: emailFrom,
      to: emailTo,
      subject: emailSubject,
      body: emailBody,
      attachments: params.attachments!,
      messageId,
      date: currentDate,
    });
  }

  // Simple text/plain email without attachments
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

interface MultipartEmailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  messageId: string;
  date: string;
}

/**
 * Creates a MIME multipart/mixed email with attachments
 */
function createMultipartEmail(params: MultipartEmailParams): EmailMessage {
  const { from, to, subject, body, attachments, messageId, date } = params;

  // Generate a unique boundary string
  const boundary = `----=_Part_${crypto.randomUUID().replace(/-/g, "")}`;

  const simulatedHeaders = {
    from,
    to,
    subject,
    "mime-version": "1.0",
    "content-type": `multipart/mixed; boundary="${boundary}"`,
    date,
    "message-id": messageId,
  };

  // Build raw email content
  let rawEmail =
    `Received: from [127.0.0.1] (localhost [127.0.0.1])\n` +
    `by dafthunk.com (Postfix) with ESMTP id FAKEIDFORTEST\n` +
    `for <${to}>; ${date}\n` +
    `From: ${from}\n` +
    `To: ${to}\n` +
    `Subject: ${subject}\n` +
    `Date: ${date}\n` +
    `Message-ID: ${messageId}\n` +
    `MIME-Version: 1.0\n` +
    `Content-Type: multipart/mixed; boundary="${boundary}"\n\n` +
    `This is a multi-part message in MIME format.\n\n`;

  // Add text body part
  rawEmail +=
    `--${boundary}\n` +
    `Content-Type: text/plain; charset="UTF-8"\n` +
    `Content-Transfer-Encoding: 7bit\n\n` +
    `${body}\n\n`;

  // Add attachment parts
  for (const attachment of attachments) {
    const filename = sanitizeFilename(attachment.filename);
    rawEmail +=
      `--${boundary}\n` +
      `Content-Type: ${attachment.mimeType}; name="${filename}"\n` +
      `Content-Disposition: attachment; filename="${filename}"\n` +
      `Content-Transfer-Encoding: base64\n\n` +
      `${formatBase64(attachment.data)}\n\n`;
  }

  // End boundary
  rawEmail += `--${boundary}--\n`;

  return {
    from,
    to,
    headers: simulatedHeaders,
    raw: rawEmail,
  };
}

/**
 * Sanitizes filename for use in MIME headers
 */
function sanitizeFilename(filename: string): string {
  // Remove or replace characters that could cause issues in MIME headers
  return filename.replace(/["\n\r]/g, "_");
}

/**
 * Formats base64 string with line breaks for MIME compliance
 * MIME requires lines to be no longer than 76 characters
 */
function formatBase64(base64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 76) {
    lines.push(base64.slice(i, i + 76));
  }
  return lines.join("\n");
}
