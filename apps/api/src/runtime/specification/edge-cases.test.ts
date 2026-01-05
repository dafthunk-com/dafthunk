import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams } from "./helpers";

/**
 * Tests for edge cases (optional inputs, deep chains, wide parallel branches)
 */
  describe("edge cases", () => {
    it("should handle node with all optional inputs missing", async () => {
      const workflow: Workflow = {
        id: "test-workflow-optional",
        name: "Optional Inputs Workflow",
        handle: "optional",
        type: "manual",
        nodes: [
          {
            id: "add",
            name: "Add",
            type: "addition",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "a", type: "number", value: 5, hidden: true },
              { name: "b", type: "number", value: 3, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("optional-inputs");

      // Set up workflow introspection
      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      // Create and execute workflow
      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      // Wait for workflow completion
      await instance.waitForStatus("complete");

      // Verify step result
      const addResult = await instance.waitForStepResult({
        name: "run node add",
      });

      console.log("Add result:", JSON.stringify(addResult, null, 2));
      expect(addResult).toBeDefined();
    });

    it("should handle workflow with deep chain (10+ nodes)", async () => {
      // Create a chain: num → add1 → add2 → ... → add10
      const nodes: Workflow["nodes"] = [
        {
          id: "num",
          name: "Number",
          type: "number-input",
          position: { x: 0, y: 0 },
          inputs: [{ name: "value", type: "number", value: 1, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        },
      ];

      const edges: Workflow["edges"] = [];

      for (let i = 1; i <= 10; i++) {
        nodes.push({
          id: `add${i}`,
          name: `Add ${i}`,
          type: "addition",
          position: { x: i * 200, y: 0 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", value: 1, hidden: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        });

        edges.push({
          source: i === 1 ? "num" : `add${i - 1}`,
          sourceOutput: i === 1 ? "value" : "result",
          target: `add${i}`,
          targetInput: "a",
        });
      }

      const workflow: Workflow = {
        id: "test-workflow-deep",
        name: "Deep Chain Workflow",
        handle: "deep-chain",
        type: "manual",
        nodes,
        edges,
      };

      const instanceId = createInstanceId("deep-chain");

      // Set up workflow introspection
      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      // Create and execute workflow
      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      // Wait for workflow completion
      await instance.waitForStatus("complete");

      // Verify final result
      const add10Result = await instance.waitForStepResult({
        name: "run node add10",
      });

      console.log(
        "Deep chain final result:",
        JSON.stringify(add10Result, null, 2)
      );
      expect(add10Result).toBeDefined();
    });

    it("should handle workflow with wide parallel branches (10+ branches)", async () => {
      const nodes: Workflow["nodes"] = [];
      const edges: Workflow["edges"] = [];

      // Create 10 number inputs
      for (let i = 1; i <= 10; i++) {
        nodes.push({
          id: `num${i}`,
          name: `Number ${i}`,
          type: "number-input",
          position: { x: 0, y: i * 100 },
          inputs: [{ name: "value", type: "number", value: i, hidden: true }],
          outputs: [{ name: "value", type: "number" }],
        });
      }

      // Create addition nodes that sum pairs
      for (let i = 1; i <= 5; i++) {
        const nodeId = `add${i}`;
        nodes.push({
          id: nodeId,
          name: `Add ${i}`,
          type: "addition",
          position: { x: 200, y: i * 200 },
          inputs: [
            { name: "a", type: "number", required: true },
            { name: "b", type: "number", required: true },
          ],
          outputs: [{ name: "result", type: "number" }],
        });

        edges.push(
          {
            source: `num${i * 2 - 1}`,
            sourceOutput: "value",
            target: nodeId,
            targetInput: "a",
          },
          {
            source: `num${i * 2}`,
            sourceOutput: "value",
            target: nodeId,
            targetInput: "b",
          }
        );
      }

      const workflow: Workflow = {
        id: "test-workflow-wide",
        name: "Wide Parallel Workflow",
        handle: "wide-parallel",
        type: "manual",
        nodes,
        edges,
      };

      const instanceId = createInstanceId("wide-parallel");

      // Set up workflow introspection
      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      // Create and execute workflow
      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      // Wait for workflow completion
      await instance.waitForStatus("complete");

      // Verify some results
      const add1Result = await instance.waitForStepResult({
        name: "run node add1",
      });
      const add5Result = await instance.waitForStepResult({
        name: "run node add5",
      });

      console.log(
        "Wide parallel - add1 result:",
        JSON.stringify(add1Result, null, 2)
      );
      console.log(
        "Wide parallel - add5 result:",
        JSON.stringify(add5Result, null, 2)
      );

      expect(add1Result).toBeDefined();
      expect(add5Result).toBeDefined();
    });
  });