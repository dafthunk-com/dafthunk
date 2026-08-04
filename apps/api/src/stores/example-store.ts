import type { ObjectStore } from "@dafthunk/runtime";
import { isObjectReference } from "@dafthunk/runtime";
import type { ObjectReference, WorkflowExample } from "@dafthunk/types";

import type { Bindings } from "../context";

/**
 * Stores a workflow's examples as one JSON document in R2, beside the workflow
 * payload it belongs to.
 *
 * R2 rather than the per-workflow Durable Object: DO storage cannot be reclaimed
 * without waking the DO, and there is no way to enumerate orphans after a
 * workflow is deleted. An R2 prefix is listable, prefix-deletable and
 * inspectable, and `workflow.json` already lives under the same prefix.
 *
 * Writes are read-modify-write and therefore last-write-wins across tabs. Two
 * people editing one workflow's examples is not a realistic problem yet; if it
 * becomes one, route writes through `WorkflowAgent`, which is already the
 * single-threaded authority for the workflow and already warm during editing.
 */
export class ExampleStore {
  constructor(private env: Bindings) {}

  private key(workflowId: string): string {
    return `workflows/${workflowId}/examples.json`;
  }

  private bucket(): R2Bucket {
    if (!this.env.RESSOURCES) {
      throw new Error("R2 bucket is not initialized");
    }
    return this.env.RESSOURCES;
  }

  async list(workflowId: string): Promise<WorkflowExample[]> {
    try {
      const object = await this.bucket().get(this.key(workflowId));
      if (!object) return [];

      const parsed = (await object.json()) as WorkflowExample[];
      if (!Array.isArray(parsed)) return [];

      // Dates round-trip through JSON as strings.
      return parsed.map((example) => ({
        ...example,
        createdAt: new Date(example.createdAt),
        updatedAt: new Date(example.updatedAt),
      }));
    } catch (error) {
      console.error(
        `ExampleStore.list: Failed to read examples for ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  async save(workflowId: string, examples: WorkflowExample[]): Promise<void> {
    try {
      await this.bucket().put(this.key(workflowId), JSON.stringify(examples), {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          workflowId,
          count: String(examples.length),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        `ExampleStore.save: Failed to write examples for ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Deletes the document and every object its examples reference.
   *
   * The objects must go explicitly: nothing garbage-collects them, so a missed
   * reference is a blob that lives and bills forever. Object deletion is
   * best-effort — a failure there must not leave the document behind, or the
   * next attempt has nothing to work from.
   */
  async delete(workflowId: string, objectStore: ObjectStore): Promise<void> {
    let examples: WorkflowExample[] = [];
    try {
      examples = await this.list(workflowId);
    } catch {
      // Unreadable document: still remove the key below.
    }

    await Promise.all(
      collectObjectReferences(examples).map(async (reference) => {
        try {
          await objectStore.deleteObject(reference);
        } catch (error) {
          console.error(
            `ExampleStore.delete: Failed to delete object ${reference.id}:`,
            error
          );
        }
      })
    );

    await this.bucket().delete(this.key(workflowId));
  }
}

/**
 * Every object an example set points at, including inside the trigger payload —
 * a form record or an email attachment can carry one just as a node value can.
 */
export function collectObjectReferences(
  examples: WorkflowExample[]
): ObjectReference[] {
  const found = new Map<string, ObjectReference>();

  const walk = (value: unknown): void => {
    if (isObjectReference(value)) {
      found.set(value.id, value);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }
    if (typeof value === "object" && value !== null) {
      for (const entry of Object.values(value)) walk(entry);
    }
  };

  for (const example of examples) {
    walk(example.nodeValues);
    walk(example.trigger);
  }

  return [...found.values()];
}
