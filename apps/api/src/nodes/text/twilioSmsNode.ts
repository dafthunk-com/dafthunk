import { ExecutableNode, NodeContext } from "../types";
import { NodeType, NodeExecution } from "@dafthunk/types";
import { Twilio } from "twilio";

export class TwilioSmsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "twilio-sms",
    name: "Twilio SMS",
    type: "twilio-sms",
    description: "Send an SMS using Twilio",
    category: "Text",
    icon: "message-square",
    inputs: [
      {
        name: "to",
        type: "string",
        description: "Recipient phone number (E.164 format)",
        required: true,
      },
      {
        name: "body",
        type: "string",
        description: "Message body",
        required: true,
      },
      {
        name: "from",
        type: "string",
        description: "Sender phone number (optional, overrides default)",
      },
    ],
    outputs: [
      {
        name: "sid",
        type: "string",
        description: "Twilio message SID",
      },
      {
        name: "status",
        type: "string",
        description: "Twilio message status",
      },
      {
        name: "error",
        type: "string",
        description: "Error message if sending failed",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { to, body, from } = context.inputs;
    const accountSid = context.env.TWILIO_ACCOUNT_SID;
    const authToken = context.env.TWILIO_AUTH_TOKEN;
    const defaultFrom = context.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
      return this.createErrorResult(
        "Twilio credentials are not set in environment variables."
      );
    }
    if (!to || !body) {
      return this.createErrorResult("'to' and 'body' are required inputs.");
    }
    const sender = from || defaultFrom;
    if (!sender) {
      return this.createErrorResult(
        "No 'from' number provided and TWILIO_PHONE_NUMBER is not set."
      );
    }
    try {
      const client = new Twilio(accountSid, authToken);
      const message = await client.messages.create({
        to,
        from: sender,
        body,
      });
      return this.createSuccessResult({
        sid: message.sid,
        status: message.status,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
} 
