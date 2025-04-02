// Types for workflows
import { ParameterValue as NodeParameterValue } from "../nodes/types";

export interface Position {
  x: number;
  y: number;
}

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
  type: string;
  description: string;
  category: string;
  icon: string;
  inputs: Parameter[];
  outputs: Parameter[];
}

export interface Node {
  id: string;
  name: string;
  type: string;
  description?: string;
  position: Position;
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string;
}

export interface Edge {
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

export interface ValidationError {
  type:
    | "CYCLE_DETECTED"
    | "TYPE_MISMATCH"
    | "INVALID_CONNECTION"
    | "DUPLICATE_CONNECTION";
  message: string;
  details: {
    nodeId?: string;
    connectionSource?: string;
    connectionTarget?: string;
  };
}

export type ExecutionState = "idle" | "executing" | "completed" | "error";

export interface ExecutionEvent {
  type: "node-start" | "node-complete" | "node-error";
  nodeId: string;
  timestamp: number;
  error?: string;
}

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  error?: string;
  outputs?: Record<string, NodeParameterValue>;
}

export interface NodeContext {
  nodeId: string;
  workflowId: string;
  inputs: Record<string, any>;
  onProgress?: (progress: number) => void;
  env?: {
    AI?: {
      run: (model: string, options: any) => any;
      toMarkdown: (
        documents: { name: string; blob: Blob }[]
      ) => Promise<
        { name: string; mimeType: string; tokens: number; data: string }[]
      >;
    };
    [key: string]: any;
  };
}

export interface WorkflowExecutionOptions {
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
  abortSignal?: AbortSignal;
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
    if (!this.value || typeof this.value !== "object") {
      return {
        isValid: false,
        error: "Value must be an object reference with id and mimeType",
      };
    }

    // For binary data that has already been converted to an object reference
    if (typeof this.value.id === "string") {
      if (typeof this.value.mimeType !== "string") {
        return { isValid: false, error: "mimeType must be a string" };
      }
      return { isValid: true };
    }
    
    // For compatibility with direct binary data during validation
    // This won't happen in normal operation since runtime converts to references
    if (this.value.data instanceof Uint8Array && typeof this.value.mimeType === "string") {
      console.warn("Binary data received direct Uint8Array format - should be converted to reference");
      return { isValid: true };
    }

    return { isValid: false, error: "Invalid binary value format" };
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
        error: "Value must be an object with data and mimeType or an object reference",
      };
    }

    // For object references (most common in runtime after conversion)
    if (typeof this.value.id === "string") {
      if (typeof this.value.mimeType !== "string") {
        return { isValid: false, error: "mimeType must be a string" };
      }
      
      if (!ImageValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${ImageValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      
      return { isValid: true };
    }
    
    // For compatibility with direct binary data (for validation during conversion)
    if (this.value.data instanceof Uint8Array && typeof this.value.mimeType === "string") {
      if (!ImageValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${ImageValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      console.warn("Image data received direct Uint8Array format - should be converted to reference");
      return { isValid: true };
    }

    return { 
      isValid: false, 
      error: "Image value must contain either an object reference (id, mimeType) or binary data (data, mimeType)" 
    };
  }
}

export class AudioValue extends ParameterValue {
  private static readonly VALID_MIME_TYPES = ["audio/mpeg", "audio/webm"];

  validate(): { isValid: boolean; error?: string } {
    if (!this.value || typeof this.value !== "object") {
      return {
        isValid: false,
        error: "Value must be an object with data and mimeType or an object reference",
      };
    }

    // For object references (most common in runtime after conversion)
    if (typeof this.value.id === "string") {
      if (typeof this.value.mimeType !== "string") {
        return { isValid: false, error: "mimeType must be a string" };
      }
      
      if (!AudioValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${AudioValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      
      return { isValid: true };
    }
    
    // For compatibility with direct binary data (for validation during conversion)
    if (this.value.data instanceof Uint8Array && typeof this.value.mimeType === "string") {
      if (!AudioValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${AudioValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      console.warn("Audio data received direct Uint8Array format - should be converted to reference");
      return { isValid: true };
    }

    return { 
      isValid: false, 
      error: "Audio value must contain either an object reference (id, mimeType) or binary data (data, mimeType)" 
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
        error: "Value must be an object with data and mimeType or an object reference",
      };
    }

    // For object references (most common in runtime after conversion)
    if (typeof this.value.id === "string") {
      if (typeof this.value.mimeType !== "string") {
        return { isValid: false, error: "mimeType must be a string" };
      }
      
      if (!DocumentValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${DocumentValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      
      return { isValid: true };
    }
    
    // For compatibility with direct binary data (for validation during conversion)
    if (this.value.data instanceof Uint8Array && typeof this.value.mimeType === "string") {
      if (!DocumentValue.VALID_MIME_TYPES.includes(this.value.mimeType)) {
        return {
          isValid: false,
          error: `mimeType must be one of: ${DocumentValue.VALID_MIME_TYPES.join(", ")}`,
        };
      }
      console.warn("Document data received direct Uint8Array format - should be converted to reference");
      return { isValid: true };
    }

    return { 
      isValid: false, 
      error: "Document value must contain either an object reference (id, mimeType) or binary data (data, mimeType)" 
    };
  }
}
