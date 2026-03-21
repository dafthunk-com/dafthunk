/**
 * Agent SDK utilities
 *
 * Typed wrapper for `getAgentByName` from the agents SDK.
 * The runtime export exists but its type declaration is not visible to
 * TypeScript due to bundled d.ts transitive dependency resolution issues.
 */

import * as agents from "agents";

/**
 * Get an Agent stub by name with proper partyserver initialization.
 *
 * This is the SDK's `getAgentByName` which internally sends a dummy fetch
 * with the x-partykit-room header to initialize the DO name before returning
 * the stub. This ensures `this.name` is available for subsequent RPC calls.
 */
export const getAgentByName = (
  agents as unknown as Record<string, unknown>
).getAgentByName as <T extends Rpc.DurableObjectBranded | undefined>(
  namespace: DurableObjectNamespace<T>,
  name: string
) => Promise<DurableObjectStub<T>>;
