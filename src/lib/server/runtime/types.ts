// Types for workflows
import { ParameterType } from "../nodes/types";

export interface Position {
  x: number;
  y: number;
}

export interface Parameter {
  name: string;
  type: RuntimeParameterConstructor;
  description?: string;
  value?: RuntimeParameter;
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
  outputs?: Record<string, ParameterType>;
}

export interface NodeContext {
  nodeId: string;
  workflowId: string;
  inputs: Record<string, any>;
  onProgress?: (progress: number) => void;
  env?: {
    AI?: {
      run: (model: string, options: any) => any;
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

export interface RuntimeParameterConstructor {
  new (value: any): RuntimeParameter;
}

export abstract class RuntimeParameter {
  constructor(protected readonly value: any) {}

  abstract validate(): { isValid: boolean; error?: string };
  public getValue(): any {
    return this.value;
  }
}

export class StringRuntimeParameter extends RuntimeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "string") {
      return { isValid: false, error: "Value must be a string" };
    }
    return { isValid: true };
  }
}

export class NumberRuntimeParameter extends RuntimeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "number" || isNaN(this.value)) {
      return { isValid: false, error: "Value must be a valid number" };
    }
    return { isValid: true };
  }
}

export class BooleanRuntimeParameter extends RuntimeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (typeof this.value !== "boolean") {
      return { isValid: false, error: "Value must be a boolean" };
    }
    return { isValid: true };
  }
}

export class ArrayRuntimeParameter extends RuntimeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (!Array.isArray(this.value)) {
      return { isValid: false, error: "Value must be an array" };
    }
    return { isValid: true };
  }
}

export class BinaryRuntimeParameter extends RuntimeParameter {
  validate(): { isValid: boolean; error?: string } {
    if (!(this.value instanceof Uint8Array)) {
      return { isValid: false, error: "Value must be a Uint8Array" };
    }
    return { isValid: true };
  }
}

export class JsonRuntimeParameter extends RuntimeParameter {
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

export class ImageRuntimeParameter extends RuntimeParameter {
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
      !ImageRuntimeParameter.VALID_MIME_TYPES.includes(this.value.mimeType)
    ) {
      return {
        isValid: false,
        error: `mimeType must be one of: ${ImageRuntimeParameter.VALID_MIME_TYPES.join(", ")}`,
      };
    }

    return { isValid: true };
  }
}

export class AudioRuntimeParameter extends RuntimeParameter {
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
      !AudioRuntimeParameter.VALID_MIME_TYPES.includes(this.value.mimeType)
    ) {
      return {
        isValid: false,
        error: `mimeType must be one of: ${AudioRuntimeParameter.VALID_MIME_TYPES.join(", ")}`,
      };
    }

    return { isValid: true };
  }
}
