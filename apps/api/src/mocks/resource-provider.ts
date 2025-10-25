/**
 * Mock Resource Provider
 *
 * Test implementation of ResourceProvider that doesn't access database tables.
 * Provides empty secrets and integrations for testing workflows that don't need them.
 */

import type { Bindings } from "../context";
import type { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import type { EmailMessage, HttpRequest, NodeContext } from "../nodes/types";

/**
 * Minimal mock that avoids database access
 */
export class MockResourceProvider {
  constructor(
    private env: Bindings,
    private toolRegistry: CloudflareToolRegistry
  ) {}

  /**
   * Mock initialization - no database access
   */
  async initialize(_organizationId: string): Promise<void> {
    // No-op - tests don't need secrets or integrations
  }

  /**
   * Creates a NodeContext for node execution
   */
  createNodeContext(
    nodeId: string,
    workflowId: string,
    organizationId: string,
    inputs: Record<string, unknown>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): NodeContext {
    return {
      nodeId,
      workflowId,
      organizationId,
      inputs,
      httpRequest,
      emailMessage,
      onProgress: () => {},
      toolRegistry: this.toolRegistry,
      getSecret: async (_secretName: string) => {
        return undefined;
      },
      getIntegration: async (integrationId: string) => {
        throw new Error(
          `Integration '${integrationId}' not available in test environment`
        );
      },
      env: {
        DB: this.env.DB,
        AI: this.env.AI,
        AI_OPTIONS: {},
        RESSOURCES: this.env.RESSOURCES,
        DATASETS: this.env.DATASETS,
        DATASETS_AUTORAG: this.env.DATASETS_AUTORAG,
        CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: this.env.CLOUDFLARE_API_TOKEN,
        CLOUDFLARE_AI_GATEWAY_ID: this.env.CLOUDFLARE_AI_GATEWAY_ID,
        TWILIO_ACCOUNT_SID: this.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: this.env.TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER: this.env.TWILIO_PHONE_NUMBER,
        SENDGRID_API_KEY: this.env.SENDGRID_API_KEY,
        SENDGRID_DEFAULT_FROM: this.env.SENDGRID_DEFAULT_FROM,
        RESEND_API_KEY: this.env.RESEND_API_KEY,
        RESEND_DEFAULT_FROM: this.env.RESEND_DEFAULT_FROM,
        AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: this.env.AWS_REGION,
        SES_DEFAULT_FROM: this.env.SES_DEFAULT_FROM,
        EMAIL_DOMAIN: this.env.EMAIL_DOMAIN,
        OPENAI_API_KEY: this.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
        GEMINI_API_KEY: this.env.GEMINI_API_KEY,
        HUGGINGFACE_API_KEY: this.env.HUGGINGFACE_API_KEY,
      },
    };
  }

  /**
   * Creates a NodeContext for tool execution
   */
  createToolContext(
    nodeId: string,
    inputs: Record<string, unknown>
  ): NodeContext {
    return {
      nodeId,
      workflowId: `tool_execution_${Date.now()}`,
      organizationId: "system",
      inputs,
      toolRegistry: this.toolRegistry,
      getSecret: async (secretName: string) => {
        throw new Error(
          `Secret access not available in tool execution context. Secret '${secretName}' cannot be accessed.`
        );
      },
      getIntegration: async (integrationId: string) => {
        throw new Error(
          `Integration access not available in tool execution context. Integration '${integrationId}' cannot be accessed.`
        );
      },
      env: {
        DB: this.env.DB,
        AI: this.env.AI,
        AI_OPTIONS: {},
        RESSOURCES: this.env.RESSOURCES,
        DATASETS: this.env.DATASETS,
        DATASETS_AUTORAG: this.env.DATASETS_AUTORAG,
        CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: this.env.CLOUDFLARE_API_TOKEN,
        CLOUDFLARE_AI_GATEWAY_ID: this.env.CLOUDFLARE_AI_GATEWAY_ID,
        TWILIO_ACCOUNT_SID: this.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: this.env.TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER: this.env.TWILIO_PHONE_NUMBER,
        SENDGRID_API_KEY: this.env.SENDGRID_API_KEY,
        SENDGRID_DEFAULT_FROM: this.env.SENDGRID_DEFAULT_FROM,
        RESEND_API_KEY: this.env.RESEND_API_KEY,
        RESEND_DEFAULT_FROM: this.env.RESEND_DEFAULT_FROM,
        AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: this.env.AWS_REGION,
        SES_DEFAULT_FROM: this.env.SES_DEFAULT_FROM,
        EMAIL_DOMAIN: this.env.EMAIL_DOMAIN,
        OPENAI_API_KEY: this.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
        GEMINI_API_KEY: this.env.GEMINI_API_KEY,
        HUGGINGFACE_API_KEY: this.env.HUGGINGFACE_API_KEY,
      },
    };
  }
}
