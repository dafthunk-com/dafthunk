import { NodeType, Parameter } from "@dafthunk/types";
import { BaseNodeRegistry } from "./base-node-registry";
import { NodeContext } from "./node-types";
import {
  JSONSchema,
  ToolDefinition,
  ToolProvider,
  ToolResult,
} from "./tool-types";

/**
 * Tool provider that exposes workflow nodes as tools
 */
export class NodeToolProvider implements ToolProvider {
  constructor(
    private nodeRegistry: BaseNodeRegistry,
    private createNodeContext: (
      nodeId: string,
      inputs: Record<string, unknown>
    ) => NodeContext
  ) {}

  /**
   * Get tool definition for a node identifier
   */
  async getToolDefinition(nodeId: string): Promise<ToolDefinition> {
    try {
      const nodeType = await this.getNodeTypeByIdentifier(nodeId);

      const parameters: JSONSchema = {
        type: "object",
        properties: {},
        required: [],
      };

      // Convert node inputs to JSON Schema properties
      for (const input of nodeType.inputs) {
        if (input.hidden) continue; // Skip hidden inputs

        const property = this.convertParameterToJSONSchemaProperty(input);
        parameters.properties![input.name] = property;

        if (input.required !== false) {
          parameters.required!.push(input.name);
        }
      }

      // Create the executable function that wraps node execution
      const executableFunction = async (args: any): Promise<string> => {
        try {
          // Coerce parameter types before execution so the tracker sees coerced values
          const coercedArgs = this.convertToolParametersToNodeInputs(
            args,
            nodeType.inputs
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
          return JSON.stringify(result.result);
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
      case "integration":
        return { ...baseProperty, type: "string" };
      default:
        return { ...baseProperty, type: "string" };
    }
  }

  /**
   * Convert tool parameters back to node input format
   */
  private convertToolParametersToNodeInputs(
    parameters: any,
    nodeInputs: Parameter[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const input of nodeInputs) {
      if (Object.hasOwn(parameters, input.name)) {
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
          return isNaN(parsed) ? value : parsed;
        }
        return value;

      case "date": {
        // Accept Date, number (epoch ms), or string; always output ISO string
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "number") {
          const d = new Date(value);
          return isNaN(d.getTime()) ? value : d.toISOString();
        }
        if (typeof value === "string") {
          const d = new Date(value);
          return isNaN(d.getTime()) ? value : d.toISOString();
        }
        return value;
      }

      case "boolean":
        if (typeof value === "string") {
          if (value.toLowerCase() === "true") return true;
          if (value.toLowerCase() === "false") return false;
          // For numeric strings, treat non-zero as true
          const num = Number(value);
          if (!isNaN(num)) return num !== 0;
        }
        return Boolean(value);

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

      case "string":
      case "image":
      case "document":
      case "audio":
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
