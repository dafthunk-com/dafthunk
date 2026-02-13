import type { QueueService, Queue as RuntimeQueue } from "@dafthunk/runtime";
import type { QueueMessage, WorkflowMode } from "@dafthunk/types";

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

  async send(payload: unknown, mode?: WorkflowMode): Promise<void> {
    const message: QueueMessage = {
      queueId: this.queueId,
      organizationId: this.organizationId,
      payload,
      timestamp: Date.now(),
      mode,
    };
    await this.binding.send(message);
  }

  async sendBatch(payloads: unknown[], mode?: WorkflowMode): Promise<void> {
    const messages: QueueMessage[] = payloads.map((payload) => ({
      queueId: this.queueId,
      organizationId: this.organizationId,
      payload,
      timestamp: Date.now(),
      mode,
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
    queueIdOrHandle: string,
    organizationId: string
  ): Promise<RuntimeQueue | undefined> {
    const db = createDatabase(this.env.DB);
    const queue = await getQueue(db, queueIdOrHandle, organizationId);

    if (!queue) return undefined;

    return new CloudflareQueue(
      queue.id,
      organizationId,
      this.env.WORKFLOW_QUEUE
    );
  }
}
