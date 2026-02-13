import type { Queue, QueueService } from "@dafthunk/runtime";

/**
 * No-op queue for testing.
 */
class MockQueue implements Queue {
  async send(): Promise<void> {}
  async sendBatch(): Promise<void> {}
}

/**
 * Mock QueueService that resolves any queue ID to a no-op capability.
 */
export class MockQueueService implements QueueService {
  async resolve(): Promise<Queue | undefined> {
    return new MockQueue();
  }
}
