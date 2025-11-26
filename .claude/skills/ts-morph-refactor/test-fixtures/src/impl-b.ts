import type { Context, Handler, Request, Response } from "./base";
import { ExecutableNode } from "./base";

/**
 * Second handler implementation
 */
export class DataHandler implements Handler {
  public readonly name = "DataHandler";

  async handle(request: Request, ctx: Context): Promise<Response> {
    const body = request.body;
    return {
      status: 200,
      data: { body, userId: ctx.userId },
    };
  }
}

/**
 * Second node implementation
 */
export class NumberNode extends ExecutableNode {
  private readonly value: number;

  constructor(nodeId: string, value: number) {
    super(nodeId);
    this.value = value;
  }

  async execute(ctx: Context): Promise<Response> {
    return this.createResponse(200, {
      value: this.value * 2,
      userId: ctx.userId,
    });
  }
}

/**
 * Third node - extends another implementation
 */
export class AdvancedNumberNode extends NumberNode {
  private readonly multiplier: number;

  constructor(nodeId: string, value: number, multiplier: number) {
    super(nodeId, value);
    this.multiplier = multiplier;
  }

  async execute(ctx: Context): Promise<Response> {
    const baseResult = await super.execute(ctx);
    return this.createResponse(200, {
      ...(baseResult.data as object),
      multiplier: this.multiplier,
    });
  }
}
