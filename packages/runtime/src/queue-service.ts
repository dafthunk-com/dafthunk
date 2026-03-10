/**
 * Abstract queue access for workflow nodes.
 *
 * Hides ownership verification and message delivery behind a
 * resolve → QueueCapability pattern. Nodes never touch D1 or
 * Cloudflare Queue bindings directly.
 */

export interface Queue {
  send(payload: unknown): Promise<void>;
  sendBatch(payloads: unknown[]): Promise<void>;
}

export interface QueueService {
  /**
   * Verifies that the queue belongs to the organization and returns
   * a QueueCapability scoped to that queue. Returns undefined if
   * the queue is not found or access is denied.
   */
  resolve(
    queueIdOrHandle: string,
    organizationId: string
  ): Promise<Queue | undefined>;
}
