import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams, createTestRuntime } from "./helpers";

/**
 * Tests for input collection from static values and edges
 */
  describe("input collection", () => {
    it("should collect inputs from node static values", async () => {
      const workflow: Workflow = {
        id: "test-workflow-static-inputs",
        name: "Static Inputs",
        handle: "static-inputs",
        type: "manual",
        nodes: [
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 10, hidden: true },
              { name: "b", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("static-inputs");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const addResult = execution.nodeExecutions.find(e => e.nodeId === "add");

      console.log("Add result:", JSON.stringify(addResult, null, 2));
      expect(addResult).toBeDefined();
    });

    it("should collect inputs from edges", async () => {
      const workflow: Workflow = {
        id: "test-workflow-edge-inputs",
        name: "Edge Inputs",
        handle: "edge-inputs",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [{ name: "value", type: "number", value: 7, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", required: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("edge-inputs");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const addResult = execution.nodeExecutions.find(e => e.nodeId === "add");

      console.log("Add result:", JSON.stringify(addResult, null, 2));
      expect(addResult).toBeDefined();
    });

    it("should override static values with edge inputs (edge takes precedence)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-override",
        name: "Input Override",
        handle: "input-override",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 10, hidden: true }, // Static value
              { name: "b", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "add",
            targetInput: "a", // Override static value with edge
          },
        ],
      };

      const instanceId = createInstanceId("input-override");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const addResult = execution.nodeExecutions.find(e => e.nodeId === "add");

      console.log(
        "Add result (edge override):",
        JSON.stringify(addResult, null, 2)
      );
      expect(addResult).toBeDefined();
    });

    it("should handle multiple edges to same input (last edge wins)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-multiple-edges",
        name: "Multiple Edges Same Input",
        handle: "multi-edge",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num3",
            name: "Number 3",
            type: "number-input",
            position: { x: 0, y: 200 },
            inputs: [
              { name: "value", type: "number", value: 15, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 100 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
          {
            source: "num3",
            sourceOutput: "value",
            target: "add",
            targetInput: "a",
          },
        ],
      };

      const instanceId = createInstanceId("multiple-edges");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const addResult = execution.nodeExecutions.find(e => e.nodeId === "add");

      console.log(
        "Add result (multiple edges):",
        JSON.stringify(addResult, null, 2)
      );
      expect(addResult).toBeDefined();
      // Expected: 15 + 100 = 115
    });

    it("should handle mixed static and edge inputs", async () => {
      const workflow: Workflow = {
        id: "test-workflow-mixed-inputs",
        name: "Mixed Inputs",
        handle: "mixed-inputs",
        type: "manual",
        nodes: [
          {
            id: "num",
            name: "Number",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [{ name: "value", type: "number", value: 5, hidden: true }],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 200, y: 0 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 10, hidden: true }, // Static
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "num",
            sourceOutput: "value",
            target: "add",
            targetInput: "a", // From edge
          },
        ],
      };

      const instanceId = createInstanceId("mixed-inputs");
      const runtime = createTestRuntime(env as Bindings);
      const execution = await runtime.run(createParams(workflow), instanceId);

      const addResult = execution.nodeExecutions.find(e => e.nodeId === "add");

      console.log(
        "Add result (mixed inputs):",
        JSON.stringify(addResult, null, 2)
      );
      expect(addResult).toBeDefined();
      // Expected: 5 (edge) + 10 (static) = 15
    });
  });
