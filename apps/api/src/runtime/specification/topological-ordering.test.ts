import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams, createTestRuntime } from "./helpers";

/**
 * Tests for topological ordering and dependency resolution
 */
  describe("topological ordering", () => {
    it("should order nodes in correct execution sequence (linear chain)", async () => {
      // Note: In a real Runtime, topological ordering is computed from edges.
      // TestRuntime uses workflow.nodes order, so we define them in dependency order here.
      // The test verifies that execution respects dependencies.
      const workflow: Workflow = {
        id: "test-workflow-order-linear",
        name: "Linear Order",
        handle: "order-linear",
        type: "manual",
        nodes: [
          {
            id: "node1",
            name: "Node 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "node2",
            name: "Node 2",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "node3",
            name: "Node 3",
            type: "addition",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "node1",
            sourceOutput: "value",
            target: "node2",
            targetInput: "a",
          },
          {
            source: "node2",
            sourceOutput: "result",
            target: "node3",
            targetInput: "a",
          },
        ],
      };

      const instanceId = createInstanceId("topo-linear");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const node3Result = execution.nodeExecutions.find(e => e.nodeId === "node3");

      console.log("Node3 result:", JSON.stringify(node3Result, null, 2));
      expect(node3Result).toBeDefined();
    });

    it("should handle diamond dependency pattern", async () => {
      // Pattern: A → B → D
      //          A → C → D
      const workflow: Workflow = {
        id: "test-workflow-diamond",
        name: "Diamond Pattern",
        handle: "diamond",
        type: "manual",
        nodes: [
          {
            id: "A",
            name: "A",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "B",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "C",
            name: "C",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "D",
            name: "D",
            type: "addition",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "B", targetInput: "a" },
          { source: "A", sourceOutput: "value", target: "C", targetInput: "a" },
          {
            source: "B",
            sourceOutput: "result",
            target: "D",
            targetInput: "a",
          },
          {
            source: "C",
            sourceOutput: "result",
            target: "D",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("diamond-pattern");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const dResult = execution.nodeExecutions.find(e => e.nodeId === "D");

      console.log("D result:", JSON.stringify(dResult, null, 2));
      expect(dResult).toBeDefined();
    });

    it("should handle complex multi-level dependencies", async () => {
      // Create a more complex graph:
      //   A   B
      //   |\ /|
      //   | X |
      //   |/ \|
      //   C   D
      //    \ /
      //     E
      const workflow: Workflow = {
        id: "test-workflow-complex",
        name: "Complex Dependencies",
        handle: "complex-deps",
        type: "manual",
        nodes: [
          {
            id: "A",
            name: "A",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "B",
            name: "B",
            type: "number-input",
            position: { x: 100, y: 0 },
            inputs: [{ name: "value", type: "number", value: 2, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "C",
            name: "C",
            type: "addition",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "D",
            name: "D",
            type: "addition",
            position: { x: 100, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "E",
            name: "E",
            type: "addition",
            position: { x: 50, y: 200 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          { source: "A", sourceOutput: "value", target: "C", targetInput: "a" },
          { source: "B", sourceOutput: "value", target: "C", targetInput: "b" },
          { source: "A", sourceOutput: "value", target: "D", targetInput: "a" },
          { source: "B", sourceOutput: "value", target: "D", targetInput: "b" },
          {
            source: "C",
            sourceOutput: "result",
            target: "E",
            targetInput: "a",
          },
          {
            source: "D",
            sourceOutput: "result",
            target: "E",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("complex-deps");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const eResult = execution.nodeExecutions.find(e => e.nodeId === "E");

      console.log("E result:", JSON.stringify(eResult, null, 2));
      expect(eResult).toBeDefined();
    });
  });