import { BaseToolRegistry } from "../nodes/base-tool-registry";
import { NodeToolProvider } from "../nodes/node-tool-provider";
import type { NodeContext } from "../nodes/types";
import type { MockNodeRegistry } from "./node-registry";

/**
 * Mock Tool Registry
 *
 * Lightweight tool registry for testing that only includes basic node tools.
 * Simpler than CloudflareToolRegistry - provides minimal setup for test workflows.
 *
 * Works with MockNodeRegistry to provide a complete but minimal testing environment.
 */
export class MockToolRegistry extends BaseToolRegistry {
  constructor(
    private nodeRegistry: MockNodeRegistry,
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
