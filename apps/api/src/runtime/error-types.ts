/**
 * Error types for workflow runtime execution.
 * Categorizes errors by their handling strategy.
 */

/**
 * Base class for all workflow-related errors
 */
export abstract class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly nodeId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Workflow validation errors - stop execution immediately
 * These are non-retryable and indicate the workflow structure is invalid.
 */
export class WorkflowValidationError extends WorkflowError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Cyclic graph error - workflow contains a cycle
 */
export class CyclicGraphError extends WorkflowError {
  constructor(
    message: string = "Unable to derive execution order. The graph may contain a cycle."
  ) {
    super(message);
  }
}

/**
 * Node execution errors - continue execution
 * These errors are recoverable at the workflow level - other nodes can still execute.
 */
export class NodeExecutionError extends WorkflowError {
  constructor(
    nodeId: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message, nodeId);
  }
}

/**
 * Node not found in workflow
 */
export class NodeNotFoundError extends NodeExecutionError {
  constructor(nodeId: string) {
    super(nodeId, `Node not found: ${nodeId}`);
  }
}

/**
 * Node type not implemented in registry
 */
export class NodeTypeNotImplementedError extends NodeExecutionError {
  constructor(nodeId: string, nodeType: string) {
    super(nodeId, `Node type not implemented: ${nodeType}`);
  }
}

/**
 * System errors - stop execution
 * These indicate infrastructure or resource issues.
 */
export class SystemError extends WorkflowError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Insufficient compute credits to run workflow
 */
export class InsufficientCreditsError extends SystemError {
  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(
      `Insufficient compute credits. Required: ${required}, Available: ${available}`
    );
  }
}
