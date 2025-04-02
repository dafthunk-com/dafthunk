/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { onRequest } from "./workflows";
import { createDatabase } from "../db";
import { workflows } from "../db/schema";
import type { Env } from "../src/lib/server/api/env";

// Mock the database
vi.mock("../db", () => ({
  createDatabase: vi.fn(),
}));

// Mock the auth middleware
vi.mock("./auth/middleware", () => ({
  withAuth: (handler) => {
    return async (context) => {
      // Simulate successful authentication
      const user = {
        sub: "mock-user-id",
        name: "Mock User",
        email: "mock@example.com",
        provider: "mock",
      };
      return handler(context.request, context.env, user);
    };
  },
}));

describe("workflows function", () => {
  let mockDb: any;
  let mockContext: { env: Env; request: Request };
  let mockDate: Date;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create a fixed date for consistent testing
    mockDate = new Date("2024-02-24T08:22:59.309Z");

    // Setup mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: "test-id",
          name: "Test Workflow", // Match the name from the test
          data: JSON.stringify({
            nodes: [{ id: "node1", type: "start" }],
            edges: [{ id: "edge1", source: "node1", target: "node2" }],
          }),
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ]),
    };

    (createDatabase as any).mockReturnValue(mockDb);

    // Setup mock context
    mockContext = {
      env: {
        DB: {} as D1Database,
        JWT_SECRET: "test-secret",
      },
      request: new Request("https://example.com/api/workflows"),
    };

    // Mock crypto.randomUUID with a valid UUID format
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "123e4567-e89b-12d3-a456-426614174000"
    );
  });

  describe("GET request", () => {
    it("should return all workflows", async () => {
      const mockWorkflows = [
        {
          id: "1",
          name: "Workflow 1",
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      mockDb.where.mockResolvedValueOnce(mockWorkflows);
      mockContext.request = new Request("https://example.com/api/workflows", {
        method: "GET",
      });

      const response = await onRequest(mockContext as any);
      const responseData = (await response.json()) as {
        workflows: typeof mockWorkflows;
      };

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        workflows: [
          {
            id: mockWorkflows[0].id,
            name: mockWorkflows[0].name,
            createdAt: mockWorkflows[0].createdAt.toISOString(),
            updatedAt: mockWorkflows[0].updatedAt.toISOString(),
          },
        ],
      });
      expect(mockDb.select).toHaveBeenCalledWith({
        id: workflows.id,
        name: workflows.name,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
      });
    });
  });

  describe("POST request", () => {
    it("should create a new workflow", async () => {
      const newWorkflow = {
        name: "New Workflow",
        nodes: [{ id: "node1", type: "start" }],
        edges: [{ id: "edge1", source: "node1", target: "node2" }],
      };

      // Update the mock to return the correct name
      mockDb.returning.mockResolvedValueOnce([
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "New Workflow",
          data: JSON.stringify({
            nodes: newWorkflow.nodes,
            edges: newWorkflow.edges,
          }),
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ]);

      mockContext.request = new Request("https://example.com/api/workflows", {
        method: "POST",
        body: JSON.stringify(newWorkflow),
      });

      const response = await onRequest(mockContext as any);
      const responseData = (await response.json()) as {
        id: string;
        name: string;
        nodes: any[];
        edges: any[];
        createdAt: string;
        updatedAt: string;
      };

      expect(response.status).toBe(201);
      expect(responseData).toHaveProperty(
        "id",
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(responseData).toHaveProperty("name", "New Workflow");
      expect(responseData.nodes).toEqual(newWorkflow.nodes);
      expect(responseData.edges).toEqual(newWorkflow.edges);
    });

    it("should handle invalid request body", async () => {
      mockContext.request = new Request("https://example.com/api/workflows", {
        method: "POST",
        body: "invalid json",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await onRequest(mockContext as any);
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Invalid request body");
    });

    it("should use default name for unnamed workflows", async () => {
      // Update the mock to return the default name
      mockDb.returning.mockResolvedValueOnce([
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Untitled Workflow",
          data: JSON.stringify({ nodes: [], edges: [] }),
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ]);

      mockContext.request = new Request("https://example.com/api/workflows", {
        method: "POST",
        body: JSON.stringify({ nodes: [], edges: [] }),
      });

      const response = await onRequest(mockContext as any);
      const responseData = (await response.json()) as { name: string };

      expect(responseData.name).toBe("Untitled Workflow");
    });
  });

  describe("Other HTTP methods", () => {
    it("should return 405 for unsupported methods", async () => {
      mockContext.request = new Request("https://example.com/api/workflows", {
        method: "PUT",
      });

      const response = await onRequest(mockContext as any);
      expect(response.status).toBe(405);
    });
  });
});
