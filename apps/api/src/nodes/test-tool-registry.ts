import { BaseToolRegistry } from "./base-tool-registry";
import { NodeToolProvider } from "./node-tool-provider";
import { TestNodeRegistry } from "./test-node-registry";
import type { NodeContext } from "./types";

/**
 * Test tool registry implementation for unit tests.
 * Simpler than CloudflareToolRegistry - only includes basic node tools.
 */
export class TestToolRegistry extends BaseToolRegistry {
  constructor(
    private nodeRegistry: TestNodeRegistry,
    private createNodeContextFn: (
      nodeId: string,
      inputs: Record<string, any>
    ) => NodeContext
  ) {
    super();
    this.initializeProviders();
  }

  protected initializeProviders(): void {
    // Register the node tool provider for "node" type tools
    const nodeToolProvider = new NodeToolProvider(
      this.nodeRegistry,
      this.createNodeContextFn
    );

    this.registerProvider("node", nodeToolProvider);
  }
}
