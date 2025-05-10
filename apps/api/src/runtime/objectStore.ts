import { v7 as uuid } from "uuid";
import type { R2Bucket, R2Object } from "@cloudflare/workers-types";
import { ObjectReference, Workflow, WorkflowExecution } from "@dafthunk/types";

export interface StoreObject {
  id: string;
  data: Uint8Array;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export class ObjectStore {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    console.log(`ObjectStore initialized with bucket:`, {
      bucketExists: !!bucket,
    });
    this.bucket = bucket;
  }

  /**
   * Write a binary object to storage and return a reference
   */
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

  /**
   * Write a binary object to storage and return a reference
   */
  async writeObjectWithId(
    id: string,
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string
  ): Promise<ObjectReference> {
    try {
      console.log(
        `ObjectStore.writeObjectWithId: Starting to write object with id ${id}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.writeObjectWithId: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `objects/${id}/object.data`;
      console.log(
        `ObjectStore.writeObjectWithId: Attempting to store object with key ${key}`
      );

      const customMetadataForR2: { [key: string]: string } = {
        id,
        createdAt: new Date().toISOString(),
        organizationId,
      };

      if (executionId) {
        customMetadataForR2.executionId = executionId;
      }

      const writeResult = await this.bucket.put(key, data, {
        httpMetadata: {
          contentType: mimeType,
          cacheControl: "public, max-age=31536000",
        },
        customMetadata: customMetadataForR2,
      });

      console.log(
        `ObjectStore.writeObjectWithId: Successfully stored object ${id}, etag: ${writeResult?.etag || "unknown"}`
      );

      return {
        id,
        mimeType: mimeType,
      };
    } catch (error) {
      console.error(
        "ObjectStore.writeObjectWithId: Failed to write object to R2:",
        error
      );
      throw error;
    }
  }

  /**
   * Read an object from storage using its reference
   */
  async readObject(reference: ObjectReference): Promise<{
    data: Uint8Array;
    metadata: R2Object["customMetadata"];
  } | null> {
    try {
      console.log(
        `ObjectStore.read: Attempting to read object with id ${reference.id}`
      );

      if (!this.bucket) {
        console.error("ObjectStore.read: R2 bucket is not initialized");
        throw new Error("R2 bucket is not initialized");
      }

      const key = `objects/${reference.id}/object.data`;
      console.log(`ObjectStore.readObject: Getting object with key ${key}`);

      const object = await this.bucket.get(key);

      if (!object) {
        console.log(`ObjectStore.readObject: Object not found with key ${key}`);
        console.error(`ObjectStore.read: Object not found: ${reference.id}`);
        return null;
      }

      console.log(
        `ObjectStore.readObject: Retrieved object ${reference.id}, size: ${object.size} bytes`
      );

      const data = await object.arrayBuffer();
      console.log(
        `ObjectStore.read: Successfully read object ${reference.id}, size: ${data.byteLength} bytes`
      );
      return {
        data: new Uint8Array(data),
        metadata: object.customMetadata,
      };
    } catch (error) {
      console.error(
        `ObjectStore.read: Failed to read object ${reference.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete an object from storage using its reference
   */
  async deleteObject(reference: ObjectReference): Promise<void> {
    try {
      console.log(
        `ObjectStore.delete: Attempting to delete object with id ${reference.id}`
      );

      if (!this.bucket) {
        console.error("ObjectStore.delete: R2 bucket is not initialized");
        throw new Error("R2 bucket is not initialized");
      }

      const key = `objects/${reference.id}/object.data`;
      console.log(`ObjectStore.deleteObject: Deleting object with key ${key}`);

      await this.bucket.delete(key);
      console.log(`ObjectStore.deleteObject: Deleted object with key ${key}`);
      console.log(
        `ObjectStore.delete: Successfully deleted object ${reference.id}`
      );
    } catch (error) {
      console.error(
        `ObjectStore.delete: Failed to delete object ${reference.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Write a workflow to storage
   */
  async writeWorkflow(workflow: Workflow): Promise<string> {
    try {
      console.log(
        `ObjectStore.writeWorkflow: Starting to write workflow ${workflow.id}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.writeWorkflow: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `workflows/${workflow.id}/workflow.json`;
      console.log(
        `ObjectStore.writeWorkflow: Attempting to store workflow with key ${key}`
      );

      const writeResult = await this.bucket.put(key, JSON.stringify(workflow), {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          updatedAt: new Date().toISOString(),
        },
      });

      console.log(
        `ObjectStore.writeWorkflow: Successfully stored workflow ${workflow.id}, etag: ${writeResult?.etag || "unknown"}`
      );

      return workflow.id;
    } catch (error) {
      console.error(
        "ObjectStore.writeWorkflow: Failed to write workflow to R2:",
        error
      );
      throw error;
    }
  }

  /**
   * Read a workflow from storage using its id
   */
  async readWorkflow(workflowId: string): Promise<Workflow> {
    try {
      console.log(
        `ObjectStore.readWorkflow: Attempting to read workflow with id ${workflowId}`
      );

      if (!this.bucket) {
        console.error("ObjectStore.readWorkflow: R2 bucket is not initialized");
        throw new Error("R2 bucket is not initialized");
      }

      const key = `workflows/${workflowId}/workflow.json`;
      console.log(`ObjectStore.readWorkflow: Getting workflow with key ${key}`);

      const object = await this.bucket.get(key);

      if (!object) {
        console.log(
          `ObjectStore.readWorkflow: Workflow not found with key ${key}`
        );
        console.error(
          `ObjectStore.readWorkflow: Workflow not found: ${workflowId}`
        );
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      console.log(
        `ObjectStore.readWorkflow: Retrieved workflow ${workflowId}, size: ${object.size} bytes`
      );

      const text = await object.text();
      const workflow = JSON.parse(text) as Workflow;
      console.log(
        `ObjectStore.readWorkflow: Successfully read workflow ${workflowId}`
      );

      return workflow;
    } catch (error) {
      console.error(
        `ObjectStore.readWorkflow: Failed to read workflow ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete a workflow from storage using its id
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      console.log(
        `ObjectStore.deleteWorkflow: Attempting to delete workflow with id ${workflowId}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.deleteWorkflow: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `workflows/${workflowId}/workflow.json`;
      console.log(
        `ObjectStore.deleteWorkflow: Deleting workflow with key ${key}`
      );

      await this.bucket.delete(key);
      console.log(
        `ObjectStore.deleteWorkflow: Deleted workflow with key ${key}`
      );
      console.log(
        `ObjectStore.deleteWorkflow: Successfully deleted workflow ${workflowId}`
      );
    } catch (error) {
      console.error(
        `ObjectStore.deleteWorkflow: Failed to delete workflow ${workflowId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Write a workflow to execution storage
   */
  async writeExecutionWorkflow(
    executionId: string,
    workflow: Workflow
  ): Promise<string> {
    try {
      console.log(
        `ObjectStore.writeExecutionWorkflow: Starting to write workflow for execution ${executionId}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.writeExecutionWorkflow: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/workflow.json`;
      console.log(
        `ObjectStore.writeExecutionWorkflow: Attempting to store workflow with key ${key}`
      );

      const writeResult = await this.bucket.put(key, JSON.stringify(workflow), {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-cache",
        },
        customMetadata: {
          executionId,
          workflowId: workflow.id,
          updatedAt: new Date().toISOString(),
        },
      });

      console.log(
        `ObjectStore.writeExecutionWorkflow: Successfully stored workflow for execution ${executionId}, etag: ${writeResult?.etag || "unknown"}`
      );

      return executionId;
    } catch (error) {
      console.error(
        `ObjectStore.writeExecutionWorkflow: Failed to write workflow to R2 for execution ${executionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Read a workflow from execution storage using its execution id
   */
  async readExecutionWorkflow(executionId: string): Promise<Workflow> {
    try {
      console.log(
        `ObjectStore.readExecutionWorkflow: Attempting to read workflow for execution ${executionId}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.readExecutionWorkflow: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/workflow.json`;
      console.log(
        `ObjectStore.readExecutionWorkflow: Getting workflow with key ${key}`
      );

      const object = await this.bucket.get(key);

      if (!object) {
        console.log(
          `ObjectStore.readExecutionWorkflow: Workflow not found with key ${key}`
        );
        console.error(
          `ObjectStore.readExecutionWorkflow: Workflow not found for execution: ${executionId}`
        );
        throw new Error(`Workflow not found for execution: ${executionId}`);
      }

      console.log(
        `ObjectStore.readExecutionWorkflow: Retrieved workflow for execution ${executionId}, size: ${object.size} bytes`
      );

      const text = await object.text();
      const workflow = JSON.parse(text) as Workflow;
      console.log(
        `ObjectStore.readExecutionWorkflow: Successfully read workflow for execution ${executionId}`
      );

      return workflow;
    } catch (error) {
      console.error(
        `ObjectStore.readExecutionWorkflow: Failed to read workflow for execution ${executionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete a workflow from execution storage using its execution id
   */
  async deleteExecutionWorkflow(executionId: string): Promise<void> {
    try {
      console.log(
        `ObjectStore.deleteExecutionWorkflow: Attempting to delete workflow for execution ${executionId}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.deleteExecutionWorkflow: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/workflow.json`;
      console.log(
        `ObjectStore.deleteExecutionWorkflow: Deleting workflow with key ${key}`
      );

      await this.bucket.delete(key);
      console.log(
        `ObjectStore.deleteExecutionWorkflow: Deleted workflow with key ${key}`
      );
      console.log(
        `ObjectStore.deleteExecutionWorkflow: Successfully deleted workflow for execution ${executionId}`
      );
    } catch (error) {
      console.error(
        `ObjectStore.deleteExecutionWorkflow: Failed to delete workflow for execution ${executionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Write an execution to storage
   */
  async writeExecution(execution: WorkflowExecution): Promise<string> {
    try {
      console.log(
        `ObjectStore.writeExecution: Starting to write execution ${execution.id}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.writeExecution: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${execution.id}/execution.json`;
      console.log(
        `ObjectStore.writeExecution: Attempting to store execution with key ${key}`
      );

      const writeResult = await this.bucket.put(
        key,
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
        }
      );

      console.log(
        `ObjectStore.writeExecution: Successfully stored execution ${execution.id}, etag: ${writeResult?.etag || "unknown"}`
      );

      return execution.id;
    } catch (error) {
      console.error(
        `ObjectStore.writeExecution: Failed to write execution to R2:`,
        error
      );
      throw error;
    }
  }

  /**
   * Read an execution from storage using its id
   */
  async readExecution(executionId: string): Promise<WorkflowExecution> {
    try {
      console.log(
        `ObjectStore.readExecution: Attempting to read execution with id ${executionId}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.readExecution: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/execution.json`;
      console.log(
        `ObjectStore.readExecution: Getting execution with key ${key}`
      );

      const object = await this.bucket.get(key);

      if (!object) {
        console.log(
          `ObjectStore.readExecution: Execution not found with key ${key}`
        );
        console.error(
          `ObjectStore.readExecution: Execution not found: ${executionId}`
        );
        throw new Error(`Execution not found: ${executionId}`);
      }

      console.log(
        `ObjectStore.readExecution: Retrieved execution ${executionId}, size: ${object.size} bytes`
      );

      const text = await object.text();
      const execution = JSON.parse(text) as WorkflowExecution;
      console.log(
        `ObjectStore.readExecution: Successfully read execution ${executionId}`
      );

      return execution;
    } catch (error) {
      console.error(
        `ObjectStore.readExecution: Failed to read execution ${executionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete an execution from storage using its id
   */
  async deleteExecution(executionId: string): Promise<void> {
    try {
      console.log(
        `ObjectStore.deleteExecution: Attempting to delete execution with id ${executionId}`
      );

      if (!this.bucket) {
        console.error(
          "ObjectStore.deleteExecution: R2 bucket is not initialized"
        );
        throw new Error("R2 bucket is not initialized");
      }

      const key = `executions/${executionId}/execution.json`;
      console.log(
        `ObjectStore.deleteExecution: Deleting execution with key ${key}`
      );

      await this.bucket.delete(key);
      console.log(
        `ObjectStore.deleteExecution: Deleted execution with key ${key}`
      );
      console.log(
        `ObjectStore.deleteExecution: Successfully deleted execution ${executionId}`
      );
    } catch (error) {
      console.error(
        `ObjectStore.deleteExecution: Failed to delete execution ${executionId}:`,
        error
      );
      throw error;
    }
  }
}
