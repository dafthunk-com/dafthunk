// Types for workflows
import {
  GeoJSON,
  Node,
  NodeExecution,
  NodeType,
  QueueMessage,
  ScheduledTrigger,
  WorkflowMode,
} from "@dafthunk/types";

import { BaseToolRegistry } from "./base-tool-registry";
import { ToolReference } from "./tool-types";

/**
 * Generic blob parameter type that accepts any MIME type.
 * Semantic types below provide workflow connection validation while allowing
 * maximum flexibility in the actual data format.
 */
export type BlobParameter = {
  data: Uint8Array;
  mimeType: string;
};

/**
 * Semantic blob types - same structure, different meaning in workflow graph.
 * The type discriminator enforces connection rules in the visual editor,
 * while the unrestricted mimeType allows any format for maximum flexibility.
 */
export type ImageParameter = BlobParameter;
export type AudioParameter = BlobParameter;
export type DocumentParameter = BlobParameter;
export type BufferGeometryParameter = BlobParameter;
export type GltfParameter = BlobParameter;

export type ParameterType =
  | {
      type: "string";
      value?: string;
    }
  | {
      type: "date";
      value?: string; // ISO 8601 timestamp
    }
  | {
      type: "number";
      value?: number;
    }
  | {
      type: "boolean";
      value?: boolean;
    }
  | {
      type: "blob";
      value?: BlobParameter;
    }
  | {
      type: "image";
      value?: ImageParameter;
    }
  | {
      type: "json";
      value?: any;
    }
  | {
      type: "document";
      value?: DocumentParameter;
    }
  | {
      type: "audio";
      value?: AudioParameter;
    }
  | {
      type: "buffergeometry";
      value?: BufferGeometryParameter;
    }
  | {
      type: "gltf";
      value?: GltfParameter;
    }
  | {
      type: "geojson";
      value?: GeoJSON;
    }
  | {
      type: "any";
      value: any;
    };

export type ParameterValue = ParameterType["value"];

export interface HttpRequest {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  formData?: Record<string, string | File>;
}

export interface EmailMessage {
  from: string;
  to: string;
  headers: Record<string, string>;
  raw: string;
}

/**
 * Minimal integration information exposed to nodes.
 * Token is automatically refreshed if expired when accessed via getIntegration.
 */
export interface IntegrationInfo {
  id: string;
  name: string;
  provider: string;
  token: string;
  metadata?: Record<string, any>;
}

export interface NodeContext {
  nodeId: string;
  workflowId: string;
  organizationId: string;
  mode: WorkflowMode;
  deploymentId?: string;
  inputs: Record<string, any>;
  onProgress?: (progress: number) => void;
  httpRequest?: HttpRequest;
  emailMessage?: EmailMessage;
  queueMessage?: QueueMessage;
  scheduledTrigger?: ScheduledTrigger;
  toolRegistry?: BaseToolRegistry;
  // Callback-based access to sensitive data (improves security and isolation)
  getSecret?: (secretName: string) => Promise<string | undefined>;
  getIntegration: (integrationId: string) => Promise<IntegrationInfo>;
  env: {
    DB: D1Database;
    AI: Ai;
    AI_OPTIONS: AiOptions;
    RESSOURCES: R2Bucket;
    DATASETS: R2Bucket;
    DATASETS_AUTORAG: string;
    DATABASE: DurableObjectNamespace;
    WORKFLOW_QUEUE: Queue;
    EMAIL_DOMAIN: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CLOUDFLARE_AI_GATEWAY_ID?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
    SENDGRID_API_KEY?: string;
    SENDGRID_DEFAULT_FROM?: string;
    RESEND_API_KEY?: string;
    RESEND_DEFAULT_FROM?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    SES_DEFAULT_FROM?: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    GEMINI_API_KEY?: string;
    HUGGINGFACE_API_KEY?: string;
  };
}

/**
 * Base class for all executable nodes
 */
export abstract class ExecutableNode {
  public readonly node: Node;
  public static readonly nodeType: NodeType;

  constructor(node: Node) {
    this.node = node;
  }

  public abstract execute(context: NodeContext): Promise<NodeExecution>;

  protected createSuccessResult(
    outputs: Record<string, ParameterValue>
  ): NodeExecution {
    return {
      nodeId: this.node.id,
      status: "completed",
      outputs,
    } as NodeExecution;
  }

  protected createErrorResult(error: string): NodeExecution {
    return {
      nodeId: this.node.id,
      status: "error",
      error,
    } as NodeExecution;
  }

  /**
   * Convert tools input to tool definitions for LLM models
   * Returns Cloudflare embedded tool definitions with executable functions
   */
  protected async convertFunctionCallsToToolDefinitions(
    functionCalls: ToolReference[],
    context: NodeContext
  ): Promise<any[]> {
    if (
      !functionCalls ||
      !Array.isArray(functionCalls) ||
      functionCalls.length === 0
    ) {
      return [];
    }

    if (!context.toolRegistry) {
      console.warn(
        "Tool registry not available in context, cannot resolve tools"
      );
      return [];
    }

    try {
      // Validate all items are proper ToolReference objects
      for (const item of functionCalls) {
        if (
          !item ||
          typeof item !== "object" ||
          !item.type ||
          !item.identifier
        ) {
          throw new Error(
            `Invalid tool reference format. Expected ToolReference with type and identifier: ${JSON.stringify(item)}`
          );
        }
      }

      // Get tool definitions (now returns Cloudflare embedded format)
      const toolDefinitions =
        await context.toolRegistry.getToolDefinitions(functionCalls);
      return toolDefinitions;
    } catch (error) {
      console.error(
        "Failed to convert function calls to tool definitions:",
        error
      );
      return [];
    }
  }

  /**
   * Convert tools input to Gemini function declarations format
   * Returns Gemini-specific function declarations for function calling
   */
  protected async convertFunctionCallsToGeminiDeclarations(
    functionCalls: ToolReference[],
    context: NodeContext
  ): Promise<any[]> {
    if (
      !functionCalls ||
      !Array.isArray(functionCalls) ||
      functionCalls.length === 0
    ) {
      return [];
    }

    if (!context.toolRegistry) {
      console.warn(
        "Tool registry not available in context, cannot resolve tools"
      );
      return [];
    }

    try {
      // Validate all items are proper ToolReference objects
      for (const item of functionCalls) {
        if (
          !item ||
          typeof item !== "object" ||
          !item.type ||
          !item.identifier
        ) {
          throw new Error(
            `Invalid tool reference format. Expected ToolReference with type and identifier: ${JSON.stringify(item)}`
          );
        }
      }

      // Get tool definitions
      const toolDefinitions =
        await context.toolRegistry.getToolDefinitions(functionCalls);

      // Convert to Gemini function declarations format
      return toolDefinitions.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
    } catch (error) {
      console.error(
        "Failed to convert function calls to Gemini declarations:",
        error
      );
      return [];
    }
  }
}
