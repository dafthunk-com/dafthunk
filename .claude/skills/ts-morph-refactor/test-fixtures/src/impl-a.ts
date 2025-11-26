import type { Context, Handler, Request, Response } from "./base";
import { ExecutableNode } from "./base";

/**
 * First handler implementation
 */
export class UserHandler implements Handler {
  public readonly name = "UserHandler";

  async handle(request: Request, ctx: Context): Promise<Response> {
    const userId = ctx.userId;
    return {
      status: 200,
      data: { userId, path: request.path },
    };
  }
}

/**
 * First node implementation
 */
export class TextNode extends ExecutableNode {
  private readonly text: string;

  constructor(nodeId: string, text: string) {
    super(nodeId);
    this.text = text;
  }

  async execute(ctx: Context): Promise<Response> {
    return this.createResponse(200, {
      text: this.text,
      processedAt: ctx.timestamp,
    });
  }
}

/**
 * Utility function in impl-a
 */
export function processText(input: string): string {
  return input.trim().toLowerCase();
}
