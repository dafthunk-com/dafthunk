/**
 * Type declarations for the Cloudflare Agents SDK (`agents` package).
 * Provides the Agent base class for Durable Objects with built-in state management.
 */
declare module "agents" {
  import { DurableObject } from "cloudflare:workers";
  import type { DurableObjectState } from "cloudflare:workers";

  /**
   * Agent base class that extends DurableObject with persistent state management.
   * Use `this.state` to read and `this.setState()` to persist state across requests.
   *
   * Note: Agent extends partyserver's Server which adds WebSocket/room routing
   * in `fetch()`. Override `fetch()` directly if you only need state management
   * and want to bypass partyserver's header requirements.
   */
  export class Agent<Env, State> extends DurableObject<Env> {
    constructor(ctx: DurableObjectState, env: Env);

    /** Current persistent state (undefined until first setState call) */
    get state(): State | undefined;

    /** Persist new state (replaces previous state) */
    setState(state: State): void;
  }
}
