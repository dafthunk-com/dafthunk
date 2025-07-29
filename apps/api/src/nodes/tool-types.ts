/**
 * Tool system types for function calling and external tool integration
 */

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
  parameters: JSONSchema;
  function: (args: any) => Promise<string>;
}

/**
 * Reference to a tool with its type and identifier
 */
export interface ToolReference {
  /**
   * The type of tool (e.g., "node" for workflow nodes)
   * Extensible for future tool types like "mcp", "http_api", etc.
   */
  type: string;

  /**
   * Unique identifier for the tool within its type
   * For nodes: the node ID
   * For future types: appropriate identifier
   */
  identifier: string;

  /**
   * Optional configuration specific to the tool type
   */
  config?: Record<string, any>;
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
   * Get the tool definition for a given identifier
   */
  getToolDefinition(identifier: string): Promise<ToolDefinition>;

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
