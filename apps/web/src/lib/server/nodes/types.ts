// Types for workflows
import { Node, NodeContext, ExecutionResult } from "../runtime/types";

export interface Parameter {
  name: string;
  type: ParameterValueConstructor;
  description?: string;
  value?: ParameterValue;
  hidden?: boolean;
  required?: boolean;
}

export interface NodeType {
  id: string;
  name: string;
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
    outputs: Record<string, ParameterValue>
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

export interface ParameterValueConstructor {
  new (value: any): ParameterValue;
}

export abstract class ParameterValue {
  constructor(protected readonly value: any) {}

  abstract validate(): { isValid: boolean; error?: string };

  public getValue(): any {
    return this.value;
  }
}

export class StringValue extends ParameterValue {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "string") {
      return { isValid: false, error: "Value must be a string" };
    }
    return { isValid: true };
  }
}

export class NumberValue extends ParameterValue {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "number" || isNaN(this.value)) {
      return { isValid: false, error: "Value must be a valid number" };
    }
    return { isValid: true };
  }
}

export class BooleanValue extends ParameterValue {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "boolean") {
      return { isValid: false, error: "Value must be a boolean" };
    }
    return { isValid: true };
  }
}

export class ArrayValue extends ParameterValue {
  validate(): { isValid: boolean; error?: string } {
    if (!Array.isArray(this.value)) {
      return { isValid: false, error: "Value must be an array" };
    }
    return { isValid: true };
  }
}

export class BinaryValue extends ParameterValue {
  validate(): { isValid: boolean; error?: string } {
    // Accept both Uint8Array (for in-memory processing) and reference objects (for stored data)
    if (
      !(this.value instanceof Uint8Array) &&
      !(
        typeof this.value === "object" &&
        typeof this.value.id === "string" &&
        typeof this.value.mimeType === "string"
      )
    ) {
      return {
        isValid: false,
        error:
          "Value must be a Uint8Array or an object reference with id and mimeType",
      };
    }
    return { isValid: true };
  }
}

export class JsonValue extends ParameterValue {
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

export class ImageValue extends ParameterValue {
  private static readonly VALID_MIME_TYPES = ["image/jpeg", "image/png"];

  validate(): { isValid: boolean; error?: string } {
    if (!this.value || typeof this.value !== "object") {
      return {
        isValid: false,
        error:
          "Value must be an object with data and mimeType or an object reference",
      };
    }

    // Accept either a direct binary object with data and mimeType
    if (this.value.data instanceof Uint8Array) {
      if (
        typeof this.value.mimeType !== "string" ||
        !ImageValue.VALID_MIME_TYPES.includes(this.value.mimeType)
      ) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${ImageValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      return { isValid: true };
    }

    // Or an object reference with id and mimeType
    if (
      typeof this.value.id === "string" &&
      typeof this.value.mimeType === "string"
    ) {
      if (!ImageValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${ImageValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error: "Value must contain either data and mimeType or id and mimeType",
    };
  }
}

export class AudioValue extends ParameterValue {
  private static readonly VALID_MIME_TYPES = ["audio/mpeg", "audio/webm"];

  validate(): { isValid: boolean; error?: string } {
    if (!this.value || typeof this.value !== "object") {
      return {
        isValid: false,
        error:
          "Value must be an object with data and mimeType or an object reference",
      };
    }

    // Accept either a direct binary object with data and mimeType
    if (this.value.data instanceof Uint8Array) {
      if (
        typeof this.value.mimeType !== "string" ||
        !AudioValue.VALID_MIME_TYPES.includes(this.value.mimeType)
      ) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${AudioValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      return { isValid: true };
    }

    // Or an object reference with id and mimeType
    if (
      typeof this.value.id === "string" &&
      typeof this.value.mimeType === "string"
    ) {
      if (!AudioValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${AudioValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error: "Value must contain either data and mimeType or id and mimeType",
    };
  }
}

export class DocumentValue extends ParameterValue {
  private static readonly VALID_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "text/html",
    "application/xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.oasis.opendocument.spreadsheet",
    "text/csv",
    "application/vnd.apple.numbers",
  ];

  validate(): { isValid: boolean; error?: string } {
    if (!this.value || typeof this.value !== "object") {
      return {
        isValid: false,
        error:
          "Value must be an object with data and mimeType or an object reference",
      };
    }

    // Accept either a direct binary object with data and mimeType
    if (this.value.data instanceof Uint8Array) {
      if (
        typeof this.value.mimeType !== "string" ||
        !DocumentValue.VALID_MIME_TYPES.includes(this.value.mimeType)
      ) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${DocumentValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      return { isValid: true };
    }

    // Or an object reference with id and mimeType
    if (
      typeof this.value.id === "string" &&
      typeof this.value.mimeType === "string"
    ) {
      if (!DocumentValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${DocumentValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      return { isValid: true };
    }

    return {
      isValid: false,
      error: "Value must contain either data and mimeType or id and mimeType",
    };
  }
}
