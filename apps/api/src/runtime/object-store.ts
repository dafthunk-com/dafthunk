import { ObjectReference, Workflow, WorkflowExecution } from "@dafthunk/types";
import { v7 as uuid } from "uuid";

/**
 * Manages R2 storage for objects, workflows, and executions.
 * Uses helper methods to eliminate duplication in logging and error handling.
 */
export class ObjectStore {
  constructor(private bucket: R2Bucket) {}

  async writeObject(
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string
  ): Promise<ObjectReference> {
    const id = uuid();
    return this.writeObjectWithId(
      id,
      data,
      mimeType,
      organizationId,
      executionId
    );
  }

  async writeObjectWithId(
    id: string,
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string
  ): Promise<ObjectReference> {
    const customMetadata: Record<string, string> = {
      id,
      createdAt: new Date().toISOString(),
      organizationId,
    };
    if (executionId) {
      customMetadata.executionId = executionId;
    }

    await this.writeToR2(
      `objects/${id}/object.data`,
      data,
      {
        httpMetadata: {
          contentType: mimeType,
          cacheControl: "public, max-age=31536000",
        },
        customMetadata,
      },
      "writeObjectWithId"
    );

    return { id, mimeType };
  }

  async readObject(reference: ObjectReference): Promise<{
    data: Uint8Array;
    metadata: R2Object["customMetadata"];
  } | null> {
    const object = await this.readFromR2(
      `objects/${reference.id}/object.data`,
      "readObject"
    );

    if (!object) return null;

    const arrayBuffer = await object.arrayBuffer();
    return {
      data: new Uint8Array(arrayBuffer),
      metadata: object.customMetadata,
    };
  }

  async deleteObject(reference: ObjectReference): Promise<void> {
    await this.deleteFromR2(
      `objects/${reference.id}/object.data`,
      "deleteObject"
    );
  }

  async listObjects(organizationId: string): Promise<
    {
      id: string;
      mimeType: string;
      size: number;
      createdAt: Date;
      organizationId: string;
      executionId?: string;
    }[]
  > {
    const objects = await this.listFromR2("objects/", "listObjects");

    return objects.objects
      .filter((obj) => obj.customMetadata?.organizationId === organizationId)
      .map((obj) => {
        const id = obj.key.split("/")[1];
        return {
          id,
          mimeType: obj.httpMetadata?.contentType || "application/octet-stream",
          size: obj.size,
          createdAt: obj.customMetadata?.createdAt
            ? new Date(obj.customMetadata.createdAt)
            : new Date(),
          organizationId,
          executionId: obj.customMetadata?.executionId,
        };
      });
  }

  async writeWorkflow(workflow: Workflow): Promise<string> {
    await this.writeToR2(
      `workflows/${workflow.id}.json`,
      JSON.stringify(workflow),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          updatedAt: new Date().toISOString(),
        },
      },
      "writeWorkflow"
    );
    return workflow.id;
  }

  async readWorkflow(workflowId: string): Promise<Workflow> {
    const object = await this.readFromR2(
      `workflows/${workflowId}.json`,
      "readWorkflow"
    );

    if (!object) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const text = await object.text();
    return JSON.parse(text) as Workflow;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.deleteFromR2(`workflows/${workflowId}.json`, "deleteWorkflow");
  }

  async writeExecutionWorkflow(
    executionId: string,
    workflow: Workflow
  ): Promise<string> {
    await this.writeToR2(
      `executions/${executionId}.json`,
      JSON.stringify(workflow),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          executionId,
          workflowId: workflow.id,
          updatedAt: new Date().toISOString(),
        },
      },
      "writeExecutionWorkflow"
    );
    return executionId;
  }

  async readExecutionWorkflow(executionId: string): Promise<Workflow> {
    const object = await this.readFromR2(
      `executions/${executionId}.json`,
      "readExecutionWorkflow"
    );

    if (!object) {
      throw new Error(`Workflow not found for execution: ${executionId}`);
    }

    const text = await object.text();
    return JSON.parse(text) as Workflow;
  }

  async deleteExecutionWorkflow(executionId: string): Promise<void> {
    await this.deleteFromR2(
      `executions/${executionId}.json`,
      "deleteExecutionWorkflow"
    );
  }

  async writeExecution(execution: WorkflowExecution): Promise<string> {
    await this.writeToR2(
      `executions/${execution.id}/execution.json`,
      JSON.stringify(execution),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          workflowId: execution.workflowId,
          status: execution.status,
          updatedAt: new Date().toISOString(),
        },
      },
      "writeExecution"
    );
    return execution.id;
  }

  async readExecution(executionId: string): Promise<WorkflowExecution> {
    const object = await this.readFromR2(
      `executions/${executionId}/execution.json`,
      "readExecution"
    );

    if (!object) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const text = await object.text();
    return JSON.parse(text) as WorkflowExecution;
  }

  async deleteExecution(executionId: string): Promise<void> {
    await this.deleteFromR2(
      `executions/${executionId}/execution.json`,
      "deleteExecution"
    );
  }

  private async writeToR2(
    key: string,
    data: string | ArrayBuffer | Uint8Array,
    options: R2PutOptions,
    operation: string
  ): Promise<void> {
    try {
      console.log(`ObjectStore.${operation}: Writing to ${key}`);

      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      const result = await this.bucket.put(key, data, options);
      console.log(
        `ObjectStore.${operation}: Success, etag: ${result?.etag || "unknown"}`
      );
    } catch (error) {
      console.error(`ObjectStore.${operation}: Failed to write ${key}:`, error);
      throw error;
    }
  }

  private async readFromR2(
    key: string,
    operation: string
  ): Promise<R2ObjectBody | null> {
    try {
      console.log(`ObjectStore.${operation}: Reading from ${key}`);

      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      const object = await this.bucket.get(key);

      if (!object) {
        console.log(`ObjectStore.${operation}: Not found at ${key}`);
        return null;
      }

      console.log(
        `ObjectStore.${operation}: Success, size: ${object.size} bytes`
      );
      return object;
    } catch (error) {
      console.error(`ObjectStore.${operation}: Failed to read ${key}:`, error);
      throw error;
    }
  }

  private async deleteFromR2(key: string, operation: string): Promise<void> {
    try {
      console.log(`ObjectStore.${operation}: Deleting ${key}`);

      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      await this.bucket.delete(key);
      console.log(`ObjectStore.${operation}: Successfully deleted ${key}`);
    } catch (error) {
      console.error(
        `ObjectStore.${operation}: Failed to delete ${key}:`,
        error
      );
      throw error;
    }
  }

  private async listFromR2(
    prefix: string,
    operation: string
  ): Promise<R2Objects> {
    try {
      console.log(`ObjectStore.${operation}: Listing with prefix ${prefix}`);

      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      const objects = await this.bucket.list({ prefix });
      console.log(
        `ObjectStore.${operation}: Found ${objects.objects.length} objects`
      );
      return objects;
    } catch (error) {
      console.error(
        `ObjectStore.${operation}: Failed to list with prefix ${prefix}:`,
        error
      );
      throw error;
    }
  }
}
