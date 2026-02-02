import { BaseNodeRegistry } from "../runtime/base-node-registry";
import { BaseToolRegistry } from "../runtime/base-tool-registry";
import { NodeToolProvider } from "../runtime/node-tool-provider";
import { NodeContext } from "../runtime/node-types";

/**
 * Cloudflare-specific tool registry implementation
 */
export class CloudflareToolRegistry extends BaseToolRegistry {
  constructor(
    private nodeRegistry: BaseNodeRegistry,
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
