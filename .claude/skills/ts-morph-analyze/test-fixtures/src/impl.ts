import type { Context, Handler, Request, Response } from "./base";
import { ExecutableNode } from "./base";

/**
 * User handler implementation.
 */
export class UserHandler implements Handler {
  public readonly name = "UserHandler";

  private cache: Map<string, unknown> = new Map();

  async handle(request: Request, ctx: Context): Promise<Response> {
    const userId = ctx.userId;
    return {
      status: 200,
      data: { userId, path: request.path },
    };
  }

  /** Clear the cache */
  public clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Text processing node.
 */
export class TextNode extends ExecutableNode {
  private readonly text: string;

  constructor(nodeId: string, text: string) {
    super(nodeId);
    this.text = text;
  }

  async execute(ctx: Context): Promise<Response> {
    this.executionCount++;
    return this.createResponse(200, {
      text: this.text,
      processedAt: ctx.timestamp,
    });
  }

  /** Get the text content */
  public getText(): string {
    return this.text;
  }
}

/**
 * Number processing node.
 */
export class NumberNode extends ExecutableNode {
  protected readonly value: number;

  constructor(nodeId: string, value: number) {
    super(nodeId);
    this.value = value;
  }

  async execute(ctx: Context): Promise<Response> {
    this.executionCount++;
    return this.createResponse(200, {
      value: this.value * 2,
      userId: ctx.userId,
    });
  }

  /** Get the value */
  public getValue(): number {
    return this.value;
  }
}

/**
 * Advanced number node with multiplier.
 */
export class AdvancedNumberNode extends NumberNode {
  private readonly multiplier: number;

  constructor(nodeId: string, value: number, multiplier: number) {
    super(nodeId, value);
    this.multiplier = multiplier;
  }

  async execute(ctx: Context): Promise<Response> {
    this.executionCount++;
    return this.createResponse(200, {
      value: this.value * this.multiplier,
      userId: ctx.userId,
    });
  }

  /** Get the multiplier */
  public getMultiplier(): number {
    return this.multiplier;
  }
}

/**
 * Service with various member types.
 */
export class UserService {
  public readonly id: string;

  private _name: string;

  protected config: Record<string, unknown>;

  constructor(id: string, name: string) {
    this.id = id;
    this._name = name;
    this.config = {};
  }

  /** Get user name */
  public get name(): string {
    return this._name;
  }

  /** Set user name */
  public set name(value: string) {
    this._name = value;
  }

  /** Get user email */
  public async getEmail(): Promise<string> {
    return `${this._name}@example.com`;
  }

  /** Update user data */
  public async update(data: Record<string, unknown>): Promise<void> {
    Object.assign(this.config, data);
  }

  /** Internal helper */
  private validate(): boolean {
    return this._name.length > 0;
  }

  /** Format data */
  protected format(data: unknown): string {
    return JSON.stringify(data);
  }

  /** Static factory */
  public static create(id: string): UserService {
    return new UserService(id, "default");
  }
}
