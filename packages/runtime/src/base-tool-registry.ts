import type {
  ToolDefinition,
  ToolProvider,
  ToolProviderConstructor,
  ToolReference,
  ToolResult,
} from "./tool-types";

/**
 * Tool call record for tracking function calls made during execution
 */
export interface ToolCall {
  name: string;
  arguments: any;
  result: any;
  timestamp: number;
}

/**
 * Tool call tracker for a specific execution context
 */
export class ToolCallTracker {
  private toolCalls: ToolCall[] = [];

  /**
   * Wrap tool definitions to track calls when executed
   */
  public wrapToolDefinitions(
    toolDefinitions: ToolDefinition[]
  ): ToolDefinition[] {
    return toolDefinitions.map((toolDef) => ({
      ...toolDef,
      function: this.wrapToolFunction(toolDef),
    }));
  }

  /**
   * Get all tool calls made during this execution
   */
  public getToolCalls(): ToolCall[] {
    return [...this.toolCalls];
  }

  /**
   * Clear all tracked tool calls
   */
  public clearToolCalls(): void {
    this.toolCalls = [];
  }

  /**
   * Wrap a tool function to track when it's called
   */
  private wrapToolFunction(
    toolDef: ToolDefinition
  ): (args: any) => Promise<string> {
    return async (args: any): Promise<string> => {
      const startTime = Date.now();

      try {
        const result = await toolDef.function(args);

        // Record the tool call
        this.toolCalls.push({
          name: toolDef.name,
          arguments: args,
          result: result,
          timestamp: startTime,
        });

        return result;
      } catch (error) {
        // Record failed tool calls too
        this.toolCalls.push({
          name: toolDef.name,
          arguments: args,
          result: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          timestamp: startTime,
        });

        throw error;
      }
    };
  }
}

/**
 * Base tool registry that manages different types of tool providers
 * and provides a unified interface for tool resolution and execution
 */
export abstract class BaseToolRegistry {
  protected providers: Map<string, ToolProvider> = new Map();

  /**
   * Register a tool provider for a specific tool type
   */
  public registerProvider(type: string, provider: ToolProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * Register a tool provider constructor that will be instantiated
   */
  public registerProviderConstructor(
    type: string,
    ProviderConstructor: ToolProviderConstructor,
    ...args: any[]
  ): void {
    const provider = new ProviderConstructor(...args);
    this.registerProvider(type, provider);
  }

  /**
   * Get tool definition for a tool reference
   */
  public async getToolDefinition(
    toolRef: ToolReference
  ): Promise<ToolDefinition> {
    const provider = this.providers.get(toolRef.type);
    if (!provider) {
      throw new Error(`No provider registered for tool type: ${toolRef.type}`);
    }
    return provider.getToolDefinition(toolRef.identifier, toolRef.config);
  }

  /**
   * Execute a tool with given parameters
   */
  public async executeTool(
    toolRef: ToolReference,
    parameters: any
  ): Promise<ToolResult> {
    const provider = this.providers.get(toolRef.type);
    if (!provider) {
      throw new Error(`No provider registered for tool type: ${toolRef.type}`);
    }
    return provider.executeTool(toolRef.identifier, parameters);
  }

  /**
   * Get all tool definitions for multiple tool references
   */
  public async getToolDefinitions(
    toolRefs: ToolReference[]
  ): Promise<ToolDefinition[]> {
    return Promise.all(
      toolRefs.map((toolRef) => this.getToolDefinition(toolRef))
    );
  }

  /**
   * Execute multiple tools with their respective parameters
   */
  public async executeTools(
    executions: Array<{ toolRef: ToolReference; parameters: any }>
  ): Promise<ToolResult[]> {
    return Promise.all(
      executions.map(({ toolRef, parameters }) =>
        this.executeTool(toolRef, parameters)
      )
    );
  }

  /**
   * Check if a tool type is supported
   */
  public hasProvider(type: string): boolean {
    return this.providers.has(type);
  }

  /**
   * Get all registered tool types
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all available tools from all providers (if they support listing)
   */
  public async getAllAvailableTools(): Promise<
    Array<{ type: string; tools: ToolDefinition[] }>
  > {
    const results: Array<{ type: string; tools: ToolDefinition[] }> = [];

    for (const [type, provider] of this.providers.entries()) {
      if (provider.listTools) {
        try {
          const tools = await provider.listTools();
          results.push({ type, tools });
        } catch (error) {
          console.warn(`Failed to list tools for provider ${type}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Abstract method for subclasses to initialize their providers
   */
  protected abstract initializeProviders(): void;
}
