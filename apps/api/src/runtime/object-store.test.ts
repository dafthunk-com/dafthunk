import type {
  ObjectReference,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ObjectStore } from "./object-store";

describe("ObjectStore", () => {
  let mockBucket: any;

  beforeEach(() => {
    mockBucket = {
      put: vi.fn().mockResolvedValue({ etag: "mock-etag" }),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn(),
    };
  });

  describe("Binary Object Storage", () => {
    describe("writeObject", () => {
      it("should write object and return reference with generated ID", async () => {
        const store = new ObjectStore(mockBucket);
        const data = new Uint8Array([1, 2, 3]);

        const result = await store.writeObject(
          data,
          "image/png",
          "org-123",
          "exec-456"
        );

        expect(result).toHaveProperty("id");
        expect(result.mimeType).toBe("image/png");
        expect(mockBucket.put).toHaveBeenCalledWith(
          expect.stringContaining("objects/"),
          data,
          expect.objectContaining({
            httpMetadata: expect.objectContaining({
              contentType: "image/png",
            }),
          })
        );
      });
    });

    describe("writeObjectWithId", () => {
      it("should write object with specific ID", async () => {
        const store = new ObjectStore(mockBucket);
        const data = new Uint8Array([1, 2, 3]);

        const result = await store.writeObjectWithId(
          "custom-id",
          data,
          "image/jpeg",
          "org-123"
        );

        expect(result.id).toBe("custom-id");
        expect(result.mimeType).toBe("image/jpeg");
        expect(mockBucket.put).toHaveBeenCalledWith(
          "objects/custom-id/object.data",
          data,
          expect.objectContaining({
            customMetadata: expect.objectContaining({
              id: "custom-id",
              organizationId: "org-123",
            }),
          })
        );
      });

      it("should include executionId when provided", async () => {
        const store = new ObjectStore(mockBucket);
        const data = new Uint8Array([1, 2, 3]);

        await store.writeObjectWithId(
          "custom-id",
          data,
          "image/png",
          "org-123",
          "exec-456"
        );

        expect(mockBucket.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Uint8Array),
          expect.objectContaining({
            customMetadata: expect.objectContaining({
              executionId: "exec-456",
            }),
          })
        );
      });
    });

    describe("readObject", () => {
      it("should read object and return data with metadata", async () => {
        const mockData = new Uint8Array([1, 2, 3]);
        mockBucket.get.mockResolvedValue({
          arrayBuffer: vi.fn().mockResolvedValue(mockData.buffer),
          size: 3,
          customMetadata: { organizationId: "org-123" },
        });

        const store = new ObjectStore(mockBucket);
        const reference: ObjectReference = {
          id: "obj-123",
          mimeType: "image/png",
        };

        const result = await store.readObject(reference);

        expect(result).not.toBeNull();
        expect(result?.data).toEqual(mockData);
        expect(result?.metadata).toEqual({ organizationId: "org-123" });
        expect(mockBucket.get).toHaveBeenCalledWith(
          "objects/obj-123/object.data"
        );
      });

      it("should return null when object not found", async () => {
        mockBucket.get.mockResolvedValue(null);

        const store = new ObjectStore(mockBucket);
        const reference: ObjectReference = {
          id: "obj-123",
          mimeType: "image/png",
        };

        const result = await store.readObject(reference);

        expect(result).toBeNull();
      });
    });

    describe("deleteObject", () => {
      it("should delete object", async () => {
        const store = new ObjectStore(mockBucket);
        const reference: ObjectReference = {
          id: "obj-123",
          mimeType: "image/png",
        };

        await store.deleteObject(reference);

        expect(mockBucket.delete).toHaveBeenCalledWith(
          "objects/obj-123/object.data"
        );
      });
    });

    describe("listObjects", () => {
      it("should list objects for organization", async () => {
        mockBucket.list.mockResolvedValue({
          objects: [
            {
              key: "objects/obj-1/object.data",
              size: 100,
              httpMetadata: { contentType: "image/png" },
              customMetadata: {
                organizationId: "org-123",
                createdAt: "2024-01-01T00:00:00Z",
                executionId: "exec-1",
              },
            },
            {
              key: "objects/obj-2/object.data",
              size: 200,
              httpMetadata: { contentType: "image/jpeg" },
              customMetadata: {
                organizationId: "org-123",
                createdAt: "2024-01-02T00:00:00Z",
              },
            },
            {
              key: "objects/obj-3/object.data",
              size: 300,
              httpMetadata: { contentType: "image/gif" },
              customMetadata: {
                organizationId: "org-456", // Different org
                createdAt: "2024-01-03T00:00:00Z",
              },
            },
          ],
        });

        const store = new ObjectStore(mockBucket);
        const result = await store.listObjects("org-123");

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: "obj-1",
          mimeType: "image/png",
          size: 100,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          organizationId: "org-123",
          executionId: "exec-1",
        });
        expect(result[1].id).toBe("obj-2");
      });
    });
  });

  describe("Workflow Storage", () => {
    describe("writeWorkflow", () => {
      it("should write workflow to storage", async () => {
        const store = new ObjectStore(mockBucket);
        const workflow: Workflow = {
          id: "workflow-123",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [],
          edges: [],
        } as unknown as Workflow;

        const result = await store.writeWorkflow(workflow);

        expect(result).toBe("workflow-123");
        expect(mockBucket.put).toHaveBeenCalledWith(
          "workflows/workflow-123/workflow.json",
          JSON.stringify(workflow),
          expect.objectContaining({
            httpMetadata: expect.objectContaining({
              contentType: "application/json",
            }),
          })
        );
      });
    });

    describe("readWorkflow", () => {
      it("should read workflow from storage", async () => {
        const workflow: Workflow = {
          id: "workflow-123",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [],
          edges: [],
        } as unknown as Workflow;

        mockBucket.get.mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(workflow)),
          size: 100,
        });

        const store = new ObjectStore(mockBucket);
        const result = await store.readWorkflow("workflow-123");

        expect(result).toEqual(workflow);
        expect(mockBucket.get).toHaveBeenCalledWith(
          "workflows/workflow-123/workflow.json"
        );
      });

      it("should throw error when workflow not found", async () => {
        mockBucket.get.mockResolvedValue(null);

        const store = new ObjectStore(mockBucket);

        await expect(store.readWorkflow("workflow-123")).rejects.toThrow(
          "Workflow not found: workflow-123"
        );
      });
    });

    describe("deleteWorkflow", () => {
      it("should delete workflow from storage", async () => {
        const store = new ObjectStore(mockBucket);

        await store.deleteWorkflow("workflow-123");

        expect(mockBucket.delete).toHaveBeenCalledWith(
          "workflows/workflow-123/workflow.json"
        );
      });
    });
  });

  describe("Execution Workflow Storage", () => {
    describe("writeExecutionWorkflow", () => {
      it("should write execution workflow snapshot", async () => {
        const store = new ObjectStore(mockBucket);
        const workflow: Workflow = {
          id: "workflow-123",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [],
          edges: [],
        } as unknown as Workflow;

        const result = await store.writeExecutionWorkflow("exec-456", workflow);

        expect(result).toBe("exec-456");
        expect(mockBucket.put).toHaveBeenCalledWith(
          "executions/exec-456/workflow.json",
          JSON.stringify(workflow),
          expect.objectContaining({
            customMetadata: expect.objectContaining({
              executionId: "exec-456",
              workflowId: "workflow-123",
            }),
          })
        );
      });
    });

    describe("readExecutionWorkflow", () => {
      it("should read execution workflow snapshot", async () => {
        const workflow: Workflow = {
          id: "workflow-123",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [],
          edges: [],
        } as unknown as Workflow;

        mockBucket.get.mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(workflow)),
          size: 100,
        });

        const store = new ObjectStore(mockBucket);
        const result = await store.readExecutionWorkflow("exec-456");

        expect(result).toEqual(workflow);
        expect(mockBucket.get).toHaveBeenCalledWith(
          "executions/exec-456/workflow.json"
        );
      });

      it("should throw error when execution workflow not found", async () => {
        mockBucket.get.mockResolvedValue(null);

        const store = new ObjectStore(mockBucket);

        await expect(store.readExecutionWorkflow("exec-456")).rejects.toThrow(
          "Workflow not found for execution: exec-456"
        );
      });
    });
  });

  describe("Execution Storage", () => {
    describe("writeExecution", () => {
      it("should write execution to storage", async () => {
        const store = new ObjectStore(mockBucket);
        const execution: WorkflowExecution = {
          id: "exec-456",
          workflowId: "workflow-123",
          status: "completed",
          nodeExecutions: [],
        };

        const result = await store.writeExecution(execution);

        expect(result).toBe("exec-456");
        expect(mockBucket.put).toHaveBeenCalledWith(
          "executions/exec-456/execution.json",
          JSON.stringify(execution),
          expect.objectContaining({
            customMetadata: expect.objectContaining({
              workflowId: "workflow-123",
              status: "completed",
            }),
          })
        );
      });
    });

    describe("readExecution", () => {
      it("should read execution from storage", async () => {
        const execution: WorkflowExecution = {
          id: "exec-456",
          workflowId: "workflow-123",
          status: "completed",
          nodeExecutions: [],
        };

        mockBucket.get.mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(execution)),
          size: 100,
        });

        const store = new ObjectStore(mockBucket);
        const result = await store.readExecution("exec-456");

        expect(result).toEqual(execution);
        expect(mockBucket.get).toHaveBeenCalledWith(
          "executions/exec-456/execution.json"
        );
      });

      it("should throw error when execution not found", async () => {
        mockBucket.get.mockResolvedValue(null);

        const store = new ObjectStore(mockBucket);

        await expect(store.readExecution("exec-456")).rejects.toThrow(
          "Execution not found: exec-456"
        );
      });
    });

    describe("deleteExecution", () => {
      it("should delete execution from storage", async () => {
        const store = new ObjectStore(mockBucket);

        await store.deleteExecution("exec-456");

        expect(mockBucket.delete).toHaveBeenCalledWith(
          "executions/exec-456/execution.json"
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw error when bucket not initialized", async () => {
      const store = new ObjectStore(null as any);

      await expect(
        store.writeObject(new Uint8Array([1, 2, 3]), "image/png", "org-123")
      ).rejects.toThrow("R2 bucket is not initialized");
    });

    it("should handle bucket put failure", async () => {
      mockBucket.put.mockRejectedValue(new Error("Storage error"));

      const store = new ObjectStore(mockBucket);

      await expect(
        store.writeObject(new Uint8Array([1, 2, 3]), "image/png", "org-123")
      ).rejects.toThrow("Storage error");
    });

    it("should handle bucket get failure", async () => {
      mockBucket.get.mockRejectedValue(new Error("Read error"));

      const store = new ObjectStore(mockBucket);
      const reference: ObjectReference = {
        id: "obj-123",
        mimeType: "image/png",
      };

      await expect(store.readObject(reference)).rejects.toThrow("Read error");
    });
  });
});
