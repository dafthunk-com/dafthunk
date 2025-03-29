// Types for workflows
import { Node, NodeContext, ExecutionResult } from "../types";

export interface Parameter {
  name: string;
  type: NodeParameterConstructor;
  description?: string;
  value?: NodeParameter;
  hidden?: boolean;
  required?: boolean;
}

export interface NodeType {
  id: string;
  name: string;
  type: string;
  description: string;
  category: string;
  icon: string;
  inputs: Parameter[];
  outputs: Parameter[];
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

  public abstract execute(context: NodeContext): Promise<ExecutionResult>;

  protected createSuccessResult(
    outputs: Record<string, NodeParameter>
  ): ExecutionResult {
    return {
      nodeId: this.node.id,
      success: true,
      outputs,
    };
  }

  protected createErrorResult(error: string): ExecutionResult {
    return {
      nodeId: this.node.id,
      success: false,
      error,
    };
  }
}
export interface NodeParameterConstructor {
  new (value: any): NodeParameter;
}

export abstract class NodeParameter {
  constructor(protected readonly value: any) {}

  abstract validate(): { isValid: boolean; error?: string };

  public getValue(): any {
    return this.value;
  }
}

export class StringNodeParameter extends NodeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "string") {
      return { isValid: false, error: "Value must be a string" };
    }
    return { isValid: true };
  }
}

export class NumberNodeParameter extends NodeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "number" || isNaN(this.value)) {
      return { isValid: false, error: "Value must be a valid number" };
    }
    return { isValid: true };
  }
}

export class BooleanNodeParameter extends NodeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "boolean") {
      return { isValid: false, error: "Value must be a boolean" };
    }
    return { isValid: true };
  }
}

export class ArrayNodeParameter extends NodeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (!Array.isArray(this.value)) {
      return { isValid: false, error: "Value must be an array" };
    }
    return { isValid: true };
  }
}

export class BinaryNodeParameter extends NodeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (!(this.value instanceof Uint8Array)) {
      return { isValid: false, error: "Value must be a Uint8Array" };
    }
    return { isValid: true };
  }
}

export class JsonNodeParameter extends NodeParameter {
  validate(): { isValid: boolean; error?: string } {
    try {
      if (typeof this.value !== "object" || this.value === null) {
        return { isValid: false, error: "Value must be a JSON object" };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: "Invalid JSON value" };
    }
  }
}

export class ImageNodeParameter extends NodeParameter {
  private static readonly VALID_MIME_TYPES = ["image/jpeg", "image/png"];

  validate(): { isValid: boolean; error?: string } {
    if (!this.value || typeof this.value !== "object") {
      return {
        isValid: false,
        error: "Value must be an object with data and mimeType",
      };
    }

    if (!(this.value.data instanceof Uint8Array)) {
      return { isValid: false, error: "Image data must be a Uint8Array" };
    }

    if (
      typeof this.value.mimeType !== "string" ||
      !ImageNodeParameter.VALID_MIME_TYPES.includes(this.value.mimeType)
    ) {
      return {
        isValid: false,
        error: `mimeType must be one of: ${ImageNodeParameter.VALID_MIME_TYPES.join(", ")}`,
      };
    }

    return { isValid: true };
  }
}

export class AudioNodeParameter extends NodeParameter {
  private static readonly VALID_MIME_TYPES = ["audio/mpeg", "audio/webm"];

  validate(): { isValid: boolean; error?: string } {
    if (!this.value || typeof this.value !== "object") {
      return {
        isValid: false,
        error: "Value must be an object with data and mimeType",
      };
    }

    if (!(this.value.data instanceof Uint8Array)) {
      return { isValid: false, error: "Audio data must be a Uint8Array" };
    }

    if (
      typeof this.value.mimeType !== "string" ||
      !AudioNodeParameter.VALID_MIME_TYPES.includes(this.value.mimeType)
    ) {
      return {
        isValid: false,
        error: `mimeType must be one of: ${AudioNodeParameter.VALID_MIME_TYPES.join(", ")}`,
      };
    }

    return { isValid: true };
  }
}
