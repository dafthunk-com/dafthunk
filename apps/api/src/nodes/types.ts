// Types for workflows
import type {
  GeoJSON,
  Node,
  NodeExecution,
  NodeType,
  ObjectReference,
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
export type GltfParameter = BlobParameter;

/**
 * Serialized blob parameter - allows for JSON-serialized Uint8Array
 * (object with numeric keys) in addition to native Uint8Array.
 */
export interface SerializedBlobParameter {
  data: Uint8Array | Record<string, number>;
  mimeType: string;
}

/**
 * Check if a value is an object reference (blob stored in R2).
 * Object references have an id and mimeType but no data property.
 */
export function isObjectReference(value: unknown): value is ObjectReference {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    "id" in obj &&
    "mimeType" in obj &&
    typeof obj.id === "string" &&
    typeof obj.mimeType === "string" &&
    !("data" in obj)
  );
}

/**
 * Check if a value is a blob parameter (native or serialized from JSON).
 * Handles both native Uint8Array and serialized format (object with numeric keys).
 */
export function isBlobParameter(value: unknown): value is SerializedBlobParameter {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (!("data" in obj) || !("mimeType" in obj)) return false;

  // Handle native Uint8Array
  if (obj.data instanceof Uint8Array) return true;

  // Handle serialized Uint8Array (plain object with numeric keys from JSON)
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    const keys = Object.keys(obj.data as object);
    return keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
  }

  return false;
}

/**
 * Convert serialized Uint8Array (from JSON) back to native Uint8Array.
 */
export function toUint8Array(data: Uint8Array | Record<string, number>): Uint8Array {
  if (data instanceof Uint8Array) return data;
  const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
  return new Uint8Array(keys.map((k) => data[k]));
}

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
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  queryParams?: Record<string, string>; // Alias for query
  body?: BlobParameter; // Raw request body with MIME type
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
    DATABASE: DurableObjectNamespace<any>;
    WORKFLOW_QUEUE: Queue;
    EMAIL_DOMAIN: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CLOUDFLARE_AI_GATEWAY_ID?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    SES_DEFAULT_FROM?: string;
    HUGGINGFACE_API_KEY?: string;
    REPLICATE_API_TOKEN?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET_NAME?: string;
  };
}

/**
 * Options for creating a node instance
 */
export interface CreateNodeOptions {
  id: string;
  name?: string;
  position: { x: number; y: number };
  description?: string;
  inputs?: Record<string, unknown>;
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

  /**
   * Creates a Node definition from this class's nodeType
   */
  static create(options: CreateNodeOptions): Node {
    const nodeType = this.nodeType;

    const inputs = nodeType.inputs.map((input) => {
      const override = options.inputs?.[input.name];
      if (override !== undefined) {
        return { ...input, value: override };
      }
      return { ...input };
    });

    return {
      id: options.id,
      name: options.name ?? nodeType.name,
      type: nodeType.type,
      description: options.description ?? nodeType.description,
      icon: nodeType.icon,
      position: options.position,
      inputs,
      outputs: nodeType.outputs.map((output) => ({ ...output })),
      ...(nodeType.functionCalling && { functionCalling: true }),
    } as Node;
  }

  public abstract execute(context: NodeContext): Promise<NodeExecution>;

  protected createSuccessResult(
    outputs: Record<string, ParameterValue>,
    usage?: number
  ): NodeExecution {
    const nodeType = (this.constructor as typeof ExecutableNode).nodeType;
    return {
      nodeId: this.node.id,
      status: "completed",
      outputs,
      usage: usage ?? nodeType.usage ?? 1,
    } as NodeExecution;
  }

  protected createErrorResult(error: string, usage?: number): NodeExecution {
    return {
      nodeId: this.node.id,
      status: "error",
      error,
      usage: usage ?? 0,
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
