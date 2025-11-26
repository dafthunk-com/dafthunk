/**
 * Base interface for all handlers.
 */
export interface Handler {
  /** Handler name */
  name: string;
  /** Process a request */
  handle(request: Request, ctx: Context): Promise<Response>;
}

/**
 * Context passed to handlers.
 */
export interface Context {
  userId: string;
  timestamp: number;
}

/**
 * Request type.
 */
export interface Request {
  method: string;
  path: string;
  body?: unknown;
}

/**
 * Response type.
 */
export interface Response {
  status: number;
  data: unknown;
}

/**
 * Base class for executable nodes.
 * All nodes must extend this class.
 */
export abstract class ExecutableNode {
  /** Unique identifier for this node */
  public readonly nodeId: string;

  /** Internal state */
  private _state: string = "idle";

  /** Execution count */
  protected executionCount: number = 0;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /**
   * Execute the node's logic.
   * @param ctx - The execution context
   */
  abstract execute(ctx: Context): Promise<Response>;

  /**
   * Create a response object.
   */
  protected createResponse(status: number, data: unknown): Response {
    return { status, data };
  }

  /** Get current state */
  public getState(): string {
    return this._state;
  }

  /** Reset the node */
  public reset(): void {
    this._state = "idle";
    this.executionCount = 0;
  }
}

/**
 * Result type for operations.
 */
export type Result<T> = { success: true; value: T } | { success: false; error: string };

/**
 * Helper function to format dates.
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Default timeout value.
 */
export const DEFAULT_TIMEOUT = 5000;
