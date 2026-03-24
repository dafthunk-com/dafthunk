import type { QueueService, Queue as RuntimeQueue } from "@dafthunk/runtime";
import type { QueueMessage } from "@dafthunk/types";

import type { Bindings } from "../context";
import { createDatabase, getQueue } from "../db";

/**
 * Queue capability object backed by Cloudflare Queues.
 * Pre-bound to a verified queue ID and organization after ownership check.
 */
class CloudflareQueue implements RuntimeQueue {
  constructor(
    private queueId: string,
    private organizationId: string,
    private binding: Queue
  ) {}

  async send(payload: unknown): Promise<void> {
    const message: QueueMessage = {
      queueId: this.queueId,
      organizationId: this.organizationId,
      payload,
      timestamp: Date.now(),
    };
    await this.binding.send(message);
  }

  async sendBatch(payloads: unknown[]): Promise<void> {
    const messages: QueueMessage[] = payloads.map((payload) => ({
      queueId: this.queueId,
      organizationId: this.organizationId,
      payload,
      timestamp: Date.now(),
    }));
    await this.binding.sendBatch(messages.map((msg) => ({ body: msg })));
  }
}

/**
 * Cloudflare-backed QueueService.
 * Verifies queue ownership via D1, then returns a Queue
 * backed by Cloudflare Queues.
 */
export class CloudflareQueueService implements QueueService {
  constructor(private env: Pick<Bindings, "DB" | "WORKFLOW_QUEUE">) {}

  async resolve(
    queueId: string,
    organizationId: string
  ): Promise<RuntimeQueue | undefined> {
    const db = createDatabase(this.env.DB);
    const queue = await getQueue(db, queueId, organizationId);

    if (!queue) return undefined;

    if (!this.env.WORKFLOW_QUEUE) {
      throw new Error("WORKFLOW_QUEUE binding is not configured.");
    }

    return new CloudflareQueue(
      queue.id,
      organizationId,
      this.env.WORKFLOW_QUEUE
    );
  }
}
