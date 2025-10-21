import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Bindings } from "../context";
import { ExecutionPersistence } from "./execution-persistence";
import type { RuntimeState } from "./runtime";

// Mock the ExecutionStore module
const { executionStoreSave, ExecutionStoreMock } = vi.hoisted(() => {
  const executionStoreSave = vi.fn(async (record) => ({
    id: record.id,
    workflowId: record.workflowId,
    status: record.status,
    nodeExecutions: record.nodeExecutions,
    error: record.error,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
  }));

  const ExecutionStoreMock = vi
    .fn()
    .mockImplementation(function ExecutionStore() {
      return {
        save: executionStoreSave,
      };
    });

  return { executionStoreSave, ExecutionStoreMock };
});

vi.mock("../stores/execution-store", () => ({
  ExecutionStore: ExecutionStoreMock,
}));

beforeEach(() => {
  executionStoreSave.mockClear();
  ExecutionStoreMock.mockClear();
});

describe("ExecutionPersistence", () => {
  const createMockEnv = (): Bindings => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const mockGet = vi.fn().mockReturnValue({ fetch: mockFetch });
    const mockIdFromName = vi.fn().mockReturnValue("mock-id");

    return {
      DB: {} as any,
      RESSOURCES: {
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
      } as any,
      WORKFLOW_SESSION: {
        idFromName: mockIdFromName,
        get: mockGet,
      } as any,
    } as Bindings;
  };

  describe("buildNodeExecutions", () => {
    it("should build execution list with completed nodes", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-1",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [{ name: "result", type: "string" }],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [{ name: "result", type: "string" }],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map([
          ["A", { result: "output A" }],
          ["B", { result: "output B" }],
        ]),
        executedNodes: new Set(["A", "B"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "completed",
      };

      const persistence = new ExecutionPersistence(createMockEnv());
      const result = persistence.buildNodeExecutions(runtimeState);

      expect(result).toEqual([
        {
          nodeId: "A",
          status: "completed",
          outputs: { result: "output A" },
        },
        {
          nodeId: "B",
          status: "completed",
          outputs: { result: "output B" },
        },
      ]);
    });

    it("should build execution list with error nodes", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-2",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", {}]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map([["B", "Something went wrong"]]),
        executionPlan: [],
        status: "error",
      };

      const persistence = new ExecutionPersistence(createMockEnv());
      const result = persistence.buildNodeExecutions(runtimeState);

      expect(result).toEqual([
        {
          nodeId: "A",
          status: "completed",
          outputs: {},
        },
        {
          nodeId: "B",
          status: "error",
          error: "Something went wrong",
        },
      ]);
    });

    it("should build execution list with skipped nodes", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-3",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", {}]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(["B"]),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "completed",
      };

      const persistence = new ExecutionPersistence(createMockEnv());
      const result = persistence.buildNodeExecutions(runtimeState);

      expect(result).toEqual([
        {
          nodeId: "A",
          status: "completed",
          outputs: {},
        },
        {
          nodeId: "B",
          status: "skipped",
        },
      ]);
    });

    it("should mark unprocessed nodes as executing", () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-4",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", {}]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "executing",
      };

      const persistence = new ExecutionPersistence(createMockEnv());
      const result = persistence.buildNodeExecutions(runtimeState);

      expect(result).toEqual([
        {
          nodeId: "A",
          status: "completed",
          outputs: {},
        },
        {
          nodeId: "B",
          status: "executing",
        },
      ]);
    });
  });

  describe("saveExecutionState", () => {
    it("should save execution state to database", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-123",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map([["A", {}]]),
        executedNodes: new Set(["A"]),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "completed",
      };

      const persistence = new ExecutionPersistence(createMockEnv());
      const startedAt = new Date("2024-01-01T00:00:00Z");
      const endedAt = new Date("2024-01-01T00:01:00Z");

      const result = await persistence.saveExecutionState(
        "user-123",
        "org-123",
        "workflow-123",
        "exec-456",
        runtimeState,
        startedAt,
        endedAt
      );

      expect(executionStoreSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "exec-456",
          workflowId: "workflow-123",
          userId: "user-123",
          organizationId: "org-123",
          status: "completed",
          startedAt,
          endedAt,
        })
      );

      expect(result.id).toBe("exec-456");
      expect(result.status).toBe("completed");
    });

    it("should handle errors with multiple node errors", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-123",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [
            {
              id: "A",
              type: "text",
              inputs: [],
              outputs: [],
            },
            {
              id: "B",
              type: "text",
              inputs: [],
              outputs: [],
            },
          ],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map(),
        executedNodes: new Set(),
        skippedNodes: new Set(),
        nodeErrors: new Map([
          ["A", "Error 1"],
          ["B", "Error 2"],
        ]),
        executionPlan: [],
        status: "error",
      };

      const persistence = new ExecutionPersistence(createMockEnv());

      const result = await persistence.saveExecutionState(
        "user-123",
        "org-123",
        "workflow-123",
        "exec-456",
        runtimeState
      );

      // Workflow-level error should have generic message for node failures
      expect(result.error).toBe("Workflow execution failed");

      // Verify node errors are in nodeExecutions
      const nodeAExec = result.nodeExecutions.find((n) => n.nodeId === "A");
      const nodeBExec = result.nodeExecutions.find((n) => n.nodeId === "B");
      expect(nodeAExec?.status).toBe("error");
      expect(nodeAExec?.error).toBe("Error 1");
      expect(nodeBExec?.status).toBe("error");
      expect(nodeBExec?.error).toBe("Error 2");
    });

    it("should handle database save failure gracefully", async () => {
      const runtimeState: RuntimeState = {
        workflow: {
          id: "workflow-123",
          name: "Test Workflow",
          handle: "test-workflow",
          type: "manual",
          nodes: [],
          edges: [],
        } as unknown as Workflow,
        nodeOutputs: new Map(),
        executedNodes: new Set(),
        skippedNodes: new Set(),
        nodeErrors: new Map(),
        executionPlan: [],
        status: "completed",
      };

      vi.mocked(executionStoreSave).mockRejectedValueOnce(
        new Error("Database error")
      );

      const persistence = new ExecutionPersistence(createMockEnv());

      const result = await persistence.saveExecutionState(
        "user-123",
        "org-123",
        "workflow-123",
        "exec-456",
        runtimeState
      );

      // Should return execution record even when database fails
      expect(result.id).toBe("exec-456");
      expect(result.workflowId).toBe("workflow-123");
    });
  });

  describe("sendExecutionUpdateToSession", () => {
    it("should send execution update via WebSocket", async () => {
      const env = createMockEnv();
      const persistence = new ExecutionPersistence(env);

      const execution: WorkflowExecution = {
        id: "exec-123",
        workflowId: "workflow-456",
        status: "executing",
        nodeExecutions: [],
      };

      await persistence.sendExecutionUpdateToSession("session-789", execution);

      expect(env.WORKFLOW_SESSION.idFromName).toHaveBeenCalledWith(
        "session-789"
      );
      expect(env.WORKFLOW_SESSION.get).toHaveBeenCalledWith("mock-id");
    });

    it("should handle WebSocket send failure gracefully", async () => {
      const env = createMockEnv();
      const mockGet = env.WORKFLOW_SESSION.get as any;
      mockGet.mockReturnValue({
        fetch: vi.fn().mockRejectedValue(new Error("Connection failed")),
      });

      const persistence = new ExecutionPersistence(env);

      const execution: WorkflowExecution = {
        id: "exec-123",
        workflowId: "workflow-456",
        status: "executing",
        nodeExecutions: [],
      };

      // Should not throw
      await expect(
        persistence.sendExecutionUpdateToSession("session-789", execution)
      ).resolves.toBeUndefined();
    });
  });
});
