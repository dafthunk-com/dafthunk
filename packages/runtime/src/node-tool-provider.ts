import type { NodeType, Parameter } from "@dafthunk/types";
import type { BaseNodeRegistry } from "./base-node-registry";
import type { NodeContext } from "./node-types";
import type {
  JSONSchema,
  ToolDefinition,
  ToolProvider,
  ToolResult,
} from "./tool-types";

/**
 * How much of a decoded body a tool may return.
 *
 * A tool result is spent from the same context the model has to reason in, and
 * it is spent for every round that follows — the result stays in the
 * conversation. So the ceiling is not "how much fits in one message" but "how
 * much fits multiplied by the number of steps". Twenty rounds at this size is
 * roughly 80,000 tokens, which leaves room inside the 131,072-token window of
 * the default agent model with the task still in it.
 *
 * The cut is announced in the text rather than silent, because a model that can
 * see it was truncated can fetch a narrower thing, and one that cannot will
 * summarize the fragment as though it were the whole.
 */
const MAX_TOOL_TEXT_CHARS = 16_000;

/** Blob payloads that carry text rather than binary. */
const TEXTUAL_MIME =
  /^text\/|^application\/(json|xml|xhtml\+xml|javascript)|\+json$|\+xml$/i;

function isBlobLike(
  value: unknown
): value is { data: Uint8Array; mimeType?: string } {
  return (
    !!value &&
    typeof value === "object" &&
    "data" in value &&
    (value as { data: unknown }).data instanceof Uint8Array
  );
}

/**
 * A node's outputs, rendered as something a model can actually read.
 *
 * `JSON.stringify` on a `BlobParameter` serializes the `Uint8Array` index by
 * index — `{"0":60,"1":33,…}` — so a single fetched page arrives as several
 * hundred kilobytes of byte map with the text nowhere in it. That is not a
 * degraded tool result, it is an unusable one, and it is why `fetch` could be
 * offered as a tool and still leave an agent with nothing to work from.
 *
 * Textual payloads are decoded; binary ones are described instead of dumped,
 * since the bytes of a PNG say nothing to a model either way.
 */
function readableOutputs(outputs: unknown): unknown {
  if (isBlobLike(outputs)) return readableBlob(outputs);

  if (!outputs || typeof outputs !== "object") return outputs;
  if (Array.isArray(outputs)) return outputs.map(readableOutputs);

  const rendered: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(outputs)) {
    rendered[name] = readableOutputs(value);
  }
  return rendered;
}

function readableBlob(blob: { data: Uint8Array; mimeType?: string }): unknown {
  const mimeType = blob.mimeType ?? "application/octet-stream";

  if (!TEXTUAL_MIME.test(mimeType)) {
    return { mimeType, bytes: blob.data.byteLength };
  }

  const text = new TextDecoder().decode(blob.data);
  return text.length > MAX_TOOL_TEXT_CHARS
    ? `${text.slice(0, MAX_TOOL_TEXT_CHARS)}\n\n[truncated: ${text.length} characters total]`
    : text;
}

/**
 * Tool provider that exposes workflow nodes as tools
 */
export class NodeToolProvider implements ToolProvider {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private nodeRegistry: BaseNodeRegistry<any>,
    private createNodeContext: (
      nodeId: string,
      inputs: Record<string, unknown>
    ) => NodeContext
  ) {}

  /**
   * Get tool definition for a node identifier.
   * When config is provided, preset parameters are excluded from the JSON schema
   * and merged at execution time (LLM args → config presets → node defaults).
   */
  async getToolDefinition(
    nodeId: string,
    config?: Record<string, unknown>
  ): Promise<ToolDefinition> {
    try {
      const nodeType = await this.getNodeTypeByIdentifier(nodeId);

      const properties: Record<string, JSONSchema> = {};
      const required: string[] = [];

      // Convert node inputs to JSON Schema properties
      for (const input of nodeType.inputs) {
        if (input.hidden) continue; // Skip hidden inputs
        if (config && Object.hasOwn(config, input.name)) continue; // Skip preset params

        properties[input.name] =
          this.convertParameterToJSONSchemaProperty(input);

        if (input.required !== false) {
          required.push(input.name);
        }
      }

      const parameters: JSONSchema = {
        type: "object",
        properties,
        required,
      };

      // Create the executable function that wraps node execution
      const executableFunction = async (args: any): Promise<string> => {
        try {
          // Coerce parameter types before execution so the tracker sees coerced values
          const coercedArgs = this.convertToolParametersToNodeInputs(
            args,
            nodeType.inputs,
            config
          );

          // Use the internal method that skips re-coercion
          const result = await this.executeToolWithCoercedParams(
            nodeId,
            coercedArgs
          );

          if (!result.success) {
            throw new Error(result.error || "Node execution failed");
          }

          // Convert result to string format expected by embedded function calling
          return JSON.stringify(readableOutputs(result.result));
        } catch (error) {
          throw new Error(
            `Tool execution failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      };

      // Build description with specification if available
      let description = nodeType.description || `Execute ${nodeType.name} node`;
      if (nodeType.specification) {
        description = `${description}\n\nSpecification:\n${nodeType.specification}`;
      }

      return {
        name: `node_${nodeType.type}`,
        description,
        specification: nodeType.specification,
        parameters,
        function: executableFunction,
      };
    } catch (error) {
      throw new Error(
        `Failed to create tool definition for ${nodeId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Execute a node as a tool
   */
  async executeTool(nodeId: string, parameters: any): Promise<ToolResult> {
    try {
      // Get node type to determine input types for coercion
      const nodeType = await this.getNodeTypeByIdentifier(nodeId);

      // Convert tool parameters to node input format with type coercion
      const nodeInputs = this.convertToolParametersToNodeInputs(
        parameters,
        nodeType.inputs
      );

      return this.executeToolWithCoercedParams(nodeId, nodeInputs);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute a node as a tool with already coerced parameters
   * Used internally to avoid double-coercion
   */
  private async executeToolWithCoercedParams(
    nodeId: string,
    nodeInputs: Record<string, any>
  ): Promise<ToolResult> {
    try {
      // Create a mock node instance for execution
      const nodeType = await this.getNodeTypeByIdentifier(nodeId);
      const mockNode = {
        id: `tool_${nodeId}_${Date.now()}`,
        name: nodeType.name,
        type: nodeType.type,
        description: nodeType.description,
        position: { x: 0, y: 0 },
        inputs: nodeType.inputs,
        outputs: nodeType.outputs,
      };

      const executable = this.nodeRegistry.createExecutableNode(mockNode);
      if (!executable) {
        return {
          success: false,
          error: `Cannot create executable node for type: ${nodeType.type}`,
        };
      }

      const context = this.createNodeContext(nodeId, nodeInputs);
      const result = await executable.execute(context);

      if (result.status === "completed") {
        return {
          success: true,
          result: result.outputs,
        };
      } else {
        return {
          success: false,
          error: result.error || "Node execution failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all available node types as tools
   */
  async listTools(): Promise<ToolDefinition[]> {
    const nodeTypes = this.nodeRegistry.getNodeTypes();
    const tools: ToolDefinition[] = [];

    // Filter to only include nodes that can be used as tools
    const toolNodeTypes = nodeTypes.filter(
      (nodeType) => nodeType.asTool === true
    );

    for (const nodeType of toolNodeTypes) {
      try {
        const tool = await this.getToolDefinition(nodeType.type);
        tools.push(tool);
      } catch (error) {
        console.warn(`Failed to create tool for ${nodeType.type}:`, error);
      }
    }

    return tools;
  }

  /**
   * Convert a Parameter to JSON Schema property
   */
  private convertParameterToJSONSchemaProperty(
    parameter: Parameter
  ): JSONSchema {
    const baseProperty: Partial<JSONSchema> = {
      description: parameter.description,
    };

    // Pass through JSON Schema metadata from Parameter
    if (parameter.minimum !== undefined)
      baseProperty.minimum = parameter.minimum;
    if (parameter.maximum !== undefined)
      baseProperty.maximum = parameter.maximum;
    if (parameter.enum) baseProperty.enum = parameter.enum;

    switch (parameter.type) {
      case "string":
        return { ...baseProperty, type: "string" };
      case "date":
        return { ...baseProperty, type: "string", format: "date-time" };
      case "number":
        return { ...baseProperty, type: "number" };
      case "boolean":
        return { ...baseProperty, type: "boolean" };
      case "json":
        return { ...baseProperty, type: "object" };
      case "image":
      case "document":
      case "audio":
        return {
          ...baseProperty,
          type: "string",
          description: `${parameter.description} (provide as base64 string or reference)`,
        };
      case "geojson":
        return {
          ...baseProperty,
          type: "object",
          description: `${parameter.description} (GeoJSON format)`,
        };
      case "database":
      case "dataset":
      case "queue":
      case "email":
      case "discord":
      case "telegram":
      case "whatsapp":
      case "slack":
      case "integration":
        return { ...baseProperty, type: "string" };
      default:
        return { ...baseProperty, type: "string" };
    }
  }

  /**
   * Convert tool parameters back to node input format.
   * Priority: (1) config presets (fixed) → (2) LLM args → (3) input.value defaults
   */
  private convertToolParametersToNodeInputs(
    parameters: any,
    nodeInputs: Parameter[],
    config?: Record<string, unknown>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const input of nodeInputs) {
      if (config && Object.hasOwn(config, input.name)) {
        result[input.name] = config[input.name];
      } else if (Object.hasOwn(parameters, input.name)) {
        result[input.name] = this.coerceParameterValue(
          parameters[input.name],
          input.type
        );
      } else if (input.value !== undefined) {
        result[input.name] = input.value;
      }
    }

    return result;
  }

  /**
   * Coerce a parameter value to the expected type
   */
  private coerceParameterValue(value: any, type: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case "number":
        if (typeof value === "string") {
          const parsed = Number(value);
          return Number.isNaN(parsed) ? value : parsed;
        }
        return value;

      case "date": {
        // Accept Date, number (epoch ms), or string; always output ISO string
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "number") {
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? value : d.toISOString();
        }
        if (typeof value === "string") {
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? value : d.toISOString();
        }
        return value;
      }

      case "boolean":
        if (typeof value === "string") {
          if (value.toLowerCase() === "true") return true;
          if (value.toLowerCase() === "false") return false;
          // For numeric strings, treat non-zero as true
          const num = Number(value);
          if (!Number.isNaN(num)) return num !== 0;
        }
        // Pass non-coercible values through unchanged so downstream type
        // validation surfaces the error instead of silently producing `true`.
        return value;

      case "json":
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            // If parsing fails, return the string as-is
            return value;
          }
        }
        return value;

      case "point":
      case "multipoint":
      case "linestring":
      case "multilinestring":
      case "polygon":
      case "multipolygon":
      case "geometry":
      case "geometrycollection":
      case "feature":
      case "featurecollection":
      case "geojson":
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            // If parsing fails, return the string as-is
            return value;
          }
        }
        return value;

      default:
        // For string types and unknown types, convert to string if not already
        return typeof value === "string" ? value : String(value);
    }
  }

  /**
   * Get node type by identifier (could be node ID or node type)
   */
  private async getNodeTypeByIdentifier(identifier: string): Promise<NodeType> {
    try {
      return this.nodeRegistry.getNodeType(identifier);
    } catch (_) {
      // If not found by type, try to find by ID
      const allNodeTypes = this.nodeRegistry.getNodeTypes();
      const matchingNodeType = allNodeTypes.find(
        (nt) => nt.id === identifier || nt.type === identifier
      );

      if (matchingNodeType) {
        return matchingNodeType;
      }

      throw new Error(`Node type not found for identifier: ${identifier}`);
    }
  }
}
