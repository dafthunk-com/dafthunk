/**
 * Tool system types for function calling and external tool integration
 */

export type { ToolReference } from "@dafthunk/types";

/**
 * JSON Schema definition for tool parameters
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  description?: string;
  enum?: any[];
  [key: string]: any;
}

/**
 * Tool definition for Cloudflare embedded function calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  specification?: string;
  parameters: JSONSchema;
  function: (args: any) => Promise<string>;
}

/**
 * Result of executing a tool
 */
export interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Interface for tool providers that can resolve and execute tools
 */
export interface ToolProvider {
  /**
   * Get the tool definition for a given identifier.
   * Config provides parameter presets that are excluded from the LLM schema
   * and merged at execution time.
   */
  getToolDefinition(
    identifier: string,
    config?: Record<string, unknown>
  ): Promise<ToolDefinition>;

  /**
   * Execute a tool with given parameters
   */
  executeTool(identifier: string, parameters: any): Promise<ToolResult>;

  /**
   * Get all available tools (optional, for discovery)
   */
  listTools?(): Promise<ToolDefinition[]>;
}

/**
 * Constructor interface for tool providers
 */
export interface ToolProviderConstructor {
  new (...args: any[]): ToolProvider;
}
