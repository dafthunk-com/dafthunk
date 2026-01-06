import type { EvalTestCase } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Bindings } from "../context";
import { EvaluationService } from "./evaluation-service";

describe("EvaluationService", () => {
  let mockEnv: Bindings;
  let evaluationService: EvaluationService;

  beforeEach(() => {
    // Create mock environment
    mockEnv = {
      DB: {} as any,
      KV: {} as any,
      RATE_LIMIT_DEFAULT: {} as any,
      RATE_LIMIT_AUTH: {} as any,
      RATE_LIMIT_EXECUTE: {} as any,
      EXECUTE: {} as any,
      WORKFLOW_SESSION: {} as any,
      DATABASE: {} as any,
      WORKFLOW_QUEUE: {} as any,
      RESSOURCES: {
        get: vi.fn(),
        put: vi.fn(),
        list: vi.fn(),
        delete: vi.fn(),
      } as any,
      DATASETS: {} as any,
      DATASETS_AUTORAG: "",
      AI: {} as any,
      AI_OPTIONS: {},
      EXECUTIONS: {} as any,
      WEB_HOST: "test",
      WEBSITE_URL: "test",
      EMAIL_DOMAIN: "",
      JWT_SECRET: "test-secret",
      SECRET_MASTER_KEY: "test-master-key",
      CLOUDFLARE_ENV: "test",
      CLOUDFLARE_ACCOUNT_ID: "test-account",
      CLOUDFLARE_API_TOKEN: "test-token",
      CLOUDFLARE_AI_GATEWAY_ID: "test-gateway",
    };

    evaluationService = new EvaluationService(mockEnv);
  });

  describe("compareOutputs", () => {
    it("should return true for exact matches", () => {
      const actual = {
        "answer-node": { value: "Hello, World!" },
      };
      const expected = {
        "answer-node": { value: "Hello, World!" },
      };

      const result = (evaluationService as any).compareOutputs(
        actual,
        expected
      );

      expect(result).toBe(true);
    });

    it("should return false for mismatches", () => {
      const actual = {
        "answer-node": { value: "Hello, World!" },
      };
      const expected = {
        "answer-node": { value: "Goodbye, World!" },
      };

      const result = (evaluationService as any).compareOutputs(
        actual,
        expected
      );

      expect(result).toBe(false);
    });

    it("should handle missing nodes", () => {
      const actual = {
        "answer-node": { value: "Hello" },
      };
      const expected = {
        "answer-node": { value: "Hello" },
        "missing-node": { value: "field" },
      };

      const result = (evaluationService as any).compareOutputs(
        actual,
        expected
      );

      expect(result).toBe(false);
    });

    it("should handle multiple outputs per node", () => {
      const actual = {
        "result-node": {
          value: "4",
          confidence: 0.95,
        },
      };
      const expected = {
        "result-node": {
          value: "4",
          confidence: 0.95,
        },
      };

      const result = (evaluationService as any).compareOutputs(
        actual,
        expected
      );

      expect(result).toBe(true);
    });

    it("should handle complex nested objects", () => {
      const actual = {
        "data-node": {
          result: { nested: { value: 42 } },
        },
      };
      const expected = {
        "data-node": {
          result: { nested: { value: 42 } },
        },
      };

      const result = (evaluationService as any).compareOutputs(
        actual,
        expected
      );

      expect(result).toBe(true);
    });
  });

  describe("calculateScores", () => {
    it("should calculate correct scores for all passing tests", () => {
      const results = [
        {
          testCaseId: "1",
          executionId: "exec-1",
          passed: true,
          actual: { "node-1": { value: "a" } },
          expected: { "node-1": { value: "a" } },
        },
        {
          testCaseId: "2",
          executionId: "exec-2",
          passed: true,
          actual: { "node-1": { value: "b" } },
          expected: { "node-1": { value: "b" } },
        },
      ];

      const scores = (evaluationService as any).calculateScores(results);

      expect(scores).toEqual({
        passed: 2,
        failed: 0,
        total: 2,
        passRate: 1.0,
      });
    });

    it("should calculate correct scores for mixed results", () => {
      const results = [
        {
          testCaseId: "1",
          executionId: "exec-1",
          passed: true,
          actual: { "node-1": { value: "a" } },
          expected: { "node-1": { value: "a" } },
        },
        {
          testCaseId: "2",
          executionId: "exec-2",
          passed: false,
          actual: { "node-1": { value: "wrong" } },
          expected: { "node-1": { value: "b" } },
        },
        {
          testCaseId: "3",
          executionId: "exec-3",
          passed: true,
          actual: { "node-1": { value: "c" } },
          expected: { "node-1": { value: "c" } },
        },
      ];

      const scores = (evaluationService as any).calculateScores(results);

      expect(scores).toEqual({
        passed: 2,
        failed: 1,
        total: 3,
        passRate: 2 / 3,
      });
    });

    it("should handle empty results", () => {
      const results: any[] = [];

      const scores = (evaluationService as any).calculateScores(results);

      expect(scores).toEqual({
        passed: 0,
        failed: 0,
        total: 0,
        passRate: 0,
      });
    });
  });

  describe("loadTestCases", () => {
    it("should load test cases from R2", async () => {
      const testCases: EvalTestCase[] = [
        {
          id: "test-1",
          input: {
            "prompt-node": { value: "What is 2+2?" },
          },
          expected: {
            "answer-node": { value: "4" },
          },
        },
      ];

      (mockEnv.RESSOURCES.get as any).mockResolvedValue({
        text: () => Promise.resolve(JSON.stringify(testCases)),
      });

      const result = await (evaluationService as any).loadTestCases("eval-123");

      expect(result).toEqual(testCases);
      expect(mockEnv.RESSOURCES.get).toHaveBeenCalledWith(
        "evaluations/eval-123/test-cases.json"
      );
    });

    it("should throw error if test cases not found", async () => {
      (mockEnv.RESSOURCES.get as any).mockResolvedValue(null);

      await expect(
        (evaluationService as any).loadTestCases("eval-123")
      ).rejects.toThrow("Test cases not found for evaluation");
    });
  });

  describe("saveTestCases", () => {
    it("should save test cases to R2", async () => {
      const testCases: EvalTestCase[] = [
        {
          id: "test-1",
          input: {
            "prompt-node": { value: "What is 2+2?" },
          },
          expected: {
            "answer-node": { value: "4" },
          },
        },
      ];

      (mockEnv.RESSOURCES.put as any).mockResolvedValue(undefined);

      await (evaluationService as any).saveTestCases(
        "eval-123",
        "org-123",
        testCases
      );

      expect(mockEnv.RESSOURCES.put).toHaveBeenCalledWith(
        "evaluations/eval-123/test-cases.json",
        JSON.stringify(testCases, null, 2),
        expect.objectContaining({
          httpMetadata: {
            contentType: "application/json",
          },
          customMetadata: {
            evaluationId: "eval-123",
            organizationId: "org-123",
            testCaseCount: "1",
            uploadedAt: expect.any(String),
          },
        })
      );
    });
  });

  describe("injectTestInputs", () => {
    it("should inject input values into workflow nodes by ID", () => {
      const workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        handle: "test",
        type: "manual" as const,
        nodes: [
          {
            id: "prompt-node",
            name: "Prompt Input",
            type: "text-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "string", value: "" }],
            outputs: [{ name: "value", type: "string" }],
          },
          {
            id: "settings-node",
            name: "Settings",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "temperature", type: "number", value: 0 },
              { name: "maxTokens", type: "number", value: 100 },
            ],
            outputs: [{ name: "temperature", type: "number" }],
          },
        ],
        edges: [],
      };

      const inputs = {
        "prompt-node": { value: "What is 2+2?" },
        "settings-node": { temperature: 0.7, maxTokens: 200 },
      };

      const result = (evaluationService as any).injectTestInputs(
        workflow,
        inputs
      );

      expect(result.nodes[0].inputs[0].value).toBe("What is 2+2?");
      expect(result.nodes[1].inputs[0].value).toBe(0.7);
      expect(result.nodes[1].inputs[1].value).toBe(200);
    });
  });

  describe("extractTestOutputs", () => {
    it("should extract outputs from nodes by ID", () => {
      const nodeExecutions = [
        {
          nodeId: "answer-node",
          status: "completed",
          outputs: { value: "4", extra: "ignored" },
          usage: 1,
        },
        {
          nodeId: "metadata-node",
          status: "completed",
          outputs: { confidence: 0.95, model: "claude-3" },
          usage: 1,
        },
      ];

      const expected = {
        "answer-node": { value: "4" },
        "metadata-node": { confidence: 0.95, model: "claude-3" },
      };

      const result = (evaluationService as any).extractTestOutputs(
        nodeExecutions,
        expected
      );

      expect(result).toEqual({
        "answer-node": { value: "4" },
        "metadata-node": { confidence: 0.95, model: "claude-3" },
      });
    });

    it("should handle missing node outputs", () => {
      const nodeExecutions = [
        {
          nodeId: "answer-node",
          status: "completed",
          outputs: { value: "4" },
          usage: 1,
        },
      ];

      const expected = {
        "answer-node": { value: "4" },
        "missing-node": { value: "missing" },
      };

      const result = (evaluationService as any).extractTestOutputs(
        nodeExecutions,
        expected
      );

      expect(result).toEqual({
        "answer-node": { value: "4" },
      });
    });

    it("should only extract specified outputs from nodes", () => {
      const nodeExecutions = [
        {
          nodeId: "result-node",
          status: "completed",
          outputs: { value: "4", confidence: 0.95, extra: "data" },
          usage: 1,
        },
      ];

      const expected = {
        "result-node": { value: "4", confidence: 0.95 },
      };

      const result = (evaluationService as any).extractTestOutputs(
        nodeExecutions,
        expected
      );

      // Should only include value and confidence, not extra
      expect(result).toEqual({
        "result-node": { value: "4", confidence: 0.95 },
      });
    });
  });
});
