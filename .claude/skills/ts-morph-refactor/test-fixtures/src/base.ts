/**
 * Base interface for handlers
 */
export interface Handler {
  name: string;
  handle(request: Request, ctx: Context): Promise<Response>;
}

/**
 * Context passed to handlers
 */
export interface Context {
  userId: string;
  timestamp: number;
}

/**
 * Request type
 */
export interface Request {
  method: string;
  path: string;
  body?: unknown;
}

/**
 * Response type
 */
export interface Response {
  status: number;
  data: unknown;
}

/**
 * Base class for executable nodes
 */
export abstract class ExecutableNode {
  public readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  abstract execute(ctx: Context): Promise<Response>;

  protected createResponse(status: number, data: unknown): Response {
    return { status, data };
  }
}

/**
 * Utility type for results
 */
export type Result<T> = { success: true; value: T } | { success: false; error: string };

/**
 * Helper function
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}
