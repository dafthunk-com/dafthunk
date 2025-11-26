import type { Context, Handler, Request } from "./base";
import { formatDate } from "./base";
import { UserHandler, TextNode, processText } from "./impl-a";
import { DataHandler, NumberNode, AdvancedNumberNode } from "./impl-b";

/**
 * Registry of all handlers
 */
export const handlers: Handler[] = [new UserHandler(), new DataHandler()];

/**
 * Create nodes for testing
 */
export function createNodes() {
  return {
    text: new TextNode("node-1", "hello world"),
    number: new NumberNode("node-2", 42),
    advanced: new AdvancedNumberNode("node-3", 10, 3),
  };
}

/**
 * Process a request through handlers
 */
export async function processRequest(request: Request, ctx: Context) {
  const results = [];

  for (const handler of handlers) {
    const result = await handler.handle(request, ctx);
    results.push({
      handler: handler.name,
      result,
      timestamp: formatDate(new Date()),
    });
  }

  return results;
}

/**
 * Execute all nodes
 */
export async function executeNodes(ctx: Context) {
  const nodes = createNodes();
  const results = [];

  for (const [name, node] of Object.entries(nodes)) {
    const result = await node.execute(ctx);
    results.push({ name, nodeId: node.nodeId, result });
  }

  return results;
}

/**
 * Uses processText from impl-a
 */
export function normalizeInput(input: string): string {
  return processText(input);
}
