import type { Workflow } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { introspectWorkflowInstance } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

import { createInstanceId, createParams } from "./helpers";

/**
 * Tests for conditional branching (fork-join patterns)
 */
  describe("conditional branching", () => {
    it("should execute true branch when condition is true", async () => {
      const workflow: Workflow = {
        id: "test-workflow-fork-true",
        name: "Conditional Fork True",
        handle: "fork-true",
        type: "manual",
        nodes: [
          {
            id: "fork",
            name: "Fork",
            type: "conditional-fork",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "condition", type: "boolean", value: true, hidden: true },
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [
              { name: "true", type: "any" },
              { name: "false", type: "any" },
            ],
          },
          {
            id: "trueNode",
            name: "True Node",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 8, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "falseNode",
            name: "False Node",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "fork",
            sourceOutput: "true",
            target: "trueNode",
            targetInput: "a",
          },
          {
            source: "fork",
            sourceOutput: "false",
            target: "falseNode",
            targetInput: "a",
          },
        ],
      };

      const instanceId = createInstanceId("fork-true");

      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      await instance.waitForStatus("complete");

      const forkResult = await instance.waitForStepResult({
        name: "run node fork",
      });
      const trueNodeResult = await instance.waitForStepResult({
        name: "run node trueNode",
      });
      const falseNodeResult = await instance.waitForStepResult({
        name: "run node falseNode",
      });

      console.log("Fork result:", JSON.stringify(forkResult, null, 2));
      console.log("True node result:", JSON.stringify(trueNodeResult, null, 2));
      console.log(
        "False node result:",
        JSON.stringify(falseNodeResult, null, 2)
      );

      expect(forkResult).toBeDefined();
      expect((forkResult as any).status).toBe("completed");

      expect(trueNodeResult).toBeDefined();
      expect((trueNodeResult as any).status).toBe("completed");

      expect(falseNodeResult).toBeDefined();
      expect((falseNodeResult as any).status).toBe("skipped");
      expect((falseNodeResult as any).skipReason).toBe("conditional_branch");
      expect((falseNodeResult as any).blockedBy).toContain("fork");
    });

    it("should execute false branch when condition is false", async () => {
      const workflow: Workflow = {
        id: "test-workflow-fork-false",
        name: "Conditional Fork False",
        handle: "fork-false",
        type: "manual",
        nodes: [
          {
            id: "fork",
            name: "Fork",
            type: "conditional-fork",
            position: { x: 0, y: 0 },
            inputs: [
              {
                name: "condition",
                type: "boolean",
                value: false,
                hidden: true,
              },
              { name: "value", type: "number", value: 42, hidden: true },
            ],
            outputs: [
              { name: "true", type: "any" },
              { name: "false", type: "any" },
            ],
          },
          {
            id: "trueNode",
            name: "True Node",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 8, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "falseNode",
            name: "False Node",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "fork",
            sourceOutput: "true",
            target: "trueNode",
            targetInput: "a",
          },
          {
            source: "fork",
            sourceOutput: "false",
            target: "falseNode",
            targetInput: "a",
          },
        ],
      };

      const instanceId = createInstanceId("fork-false");

      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      await instance.waitForStatus("complete");

      const forkResult = await instance.waitForStepResult({
        name: "run node fork",
      });
      const trueNodeResult = await instance.waitForStepResult({
        name: "run node trueNode",
      });
      const falseNodeResult = await instance.waitForStepResult({
        name: "run node falseNode",
      });

      console.log("Fork result:", JSON.stringify(forkResult, null, 2));
      console.log("True node result:", JSON.stringify(trueNodeResult, null, 2));
      console.log(
        "False node result:",
        JSON.stringify(falseNodeResult, null, 2)
      );

      expect(forkResult).toBeDefined();
      expect((forkResult as any).status).toBe("completed");

      expect(trueNodeResult).toBeDefined();
      expect((trueNodeResult as any).status).toBe("skipped");
      expect((trueNodeResult as any).skipReason).toBe("conditional_branch");
      expect((trueNodeResult as any).blockedBy).toContain("fork");

      expect(falseNodeResult).toBeDefined();
      expect((falseNodeResult as any).status).toBe("completed");
    });

    it("should handle fork-join pattern (true branch)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-fork-join-true",
        name: "Fork-Join True",
        handle: "fork-join-true",
        type: "manual",
        nodes: [
          {
            id: "fork",
            name: "Fork",
            type: "conditional-fork",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "condition", type: "boolean", value: true, hidden: true },
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [
              { name: "true", type: "any" },
              { name: "false", type: "any" },
            ],
          },
          {
            id: "trueNode",
            name: "True Node",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 5, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "falseNode",
            name: "False Node",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "join",
            name: "Join",
            type: "conditional-join",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "any", required: false },
              { name: "b", type: "any", required: false },
            ],
            outputs: [{ name: "result", type: "any" }],
          },
        ],
        edges: [
          {
            source: "fork",
            sourceOutput: "true",
            target: "trueNode",
            targetInput: "a",
          },
          {
            source: "fork",
            sourceOutput: "false",
            target: "falseNode",
            targetInput: "a",
          },
          {
            source: "trueNode",
            sourceOutput: "result",
            target: "join",
            targetInput: "a",
          },
          {
            source: "falseNode",
            sourceOutput: "result",
            target: "join",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("fork-join-true");

      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      await instance.waitForStatus("complete");

      const forkResult = await instance.waitForStepResult({
        name: "run node fork",
      });
      const trueNodeResult = await instance.waitForStepResult({
        name: "run node trueNode",
      });
      const falseNodeResult = await instance.waitForStepResult({
        name: "run node falseNode",
      });
      const joinResult = await instance.waitForStepResult({
        name: "run node join",
      });

      console.log("Fork result:", JSON.stringify(forkResult, null, 2));
      console.log("True node result:", JSON.stringify(trueNodeResult, null, 2));
      console.log(
        "False node result:",
        JSON.stringify(falseNodeResult, null, 2)
      );
      console.log("Join result:", JSON.stringify(joinResult, null, 2));

      expect((forkResult as any).status).toBe("completed");
      expect((trueNodeResult as any).status).toBe("completed");
      expect((falseNodeResult as any).status).toBe("skipped");
      expect((joinResult as any).status).toBe("completed");
    });

    it("should handle fork-join pattern (false branch)", async () => {
      const workflow: Workflow = {
        id: "test-workflow-fork-join-false",
        name: "Fork-Join False",
        handle: "fork-join-false",
        type: "manual",
        nodes: [
          {
            id: "fork",
            name: "Fork",
            type: "conditional-fork",
            position: { x: 0, y: 0 },
            inputs: [
              {
                name: "condition",
                type: "boolean",
                value: false,
                hidden: true,
              },
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [
              { name: "true", type: "any" },
              { name: "false", type: "any" },
            ],
          },
          {
            id: "trueNode",
            name: "True Node",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 5, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "falseNode",
            name: "False Node",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "join",
            name: "Join",
            type: "conditional-join",
            position: { x: 400, y: 0 },
            inputs: [
              { name: "a", type: "any", required: false },
              { name: "b", type: "any", required: false },
            ],
            outputs: [{ name: "result", type: "any" }],
          },
        ],
        edges: [
          {
            source: "fork",
            sourceOutput: "true",
            target: "trueNode",
            targetInput: "a",
          },
          {
            source: "fork",
            sourceOutput: "false",
            target: "falseNode",
            targetInput: "a",
          },
          {
            source: "trueNode",
            sourceOutput: "result",
            target: "join",
            targetInput: "a",
          },
          {
            source: "falseNode",
            sourceOutput: "result",
            target: "join",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("fork-join-false");

      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      await instance.waitForStatus("complete");

      const forkResult = await instance.waitForStepResult({
        name: "run node fork",
      });
      const trueNodeResult = await instance.waitForStepResult({
        name: "run node trueNode",
      });
      const falseNodeResult = await instance.waitForStepResult({
        name: "run node falseNode",
      });
      const joinResult = await instance.waitForStepResult({
        name: "run node join",
      });

      console.log("Fork result:", JSON.stringify(forkResult, null, 2));
      console.log("True node result:", JSON.stringify(trueNodeResult, null, 2));
      console.log(
        "False node result:",
        JSON.stringify(falseNodeResult, null, 2)
      );
      console.log("Join result:", JSON.stringify(joinResult, null, 2));

      expect((forkResult as any).status).toBe("completed");
      expect((trueNodeResult as any).status).toBe("skipped");
      expect((falseNodeResult as any).status).toBe("completed");
      expect((joinResult as any).status).toBe("completed");
    });

    it("should handle chained nodes after conditional fork", async () => {
      const workflow: Workflow = {
        id: "test-workflow-fork-chain",
        name: "Fork with Chain",
        handle: "fork-chain",
        type: "manual",
        nodes: [
          {
            id: "fork",
            name: "Fork",
            type: "conditional-fork",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "condition", type: "boolean", value: true, hidden: true },
              { name: "value", type: "number", value: 5, hidden: true },
            ],
            outputs: [
              { name: "true", type: "any" },
              { name: "false", type: "any" },
            ],
          },
          {
            id: "trueNode1",
            name: "True Node 1",
            type: "addition",
            position: { x: 200, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 1, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "trueNode2",
            name: "True Node 2",
            type: "multiplication",
            position: { x: 400, y: -50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 2, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
          {
            id: "falseNode",
            name: "False Node",
            type: "addition",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "number", required: true },
              { name: "b", type: "number", value: 100, hidden: true },
            ],
            outputs: [{ name: "result", type: "number" }],
          },
        ],
        edges: [
          {
            source: "fork",
            sourceOutput: "true",
            target: "trueNode1",
            targetInput: "a",
          },
          {
            source: "trueNode1",
            sourceOutput: "result",
            target: "trueNode2",
            targetInput: "a",
          },
          {
            source: "fork",
            sourceOutput: "false",
            target: "falseNode",
            targetInput: "a",
          },
        ],
      };

      const instanceId = createInstanceId("fork-chain");

      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      await instance.waitForStatus("complete");

      const forkResult = await instance.waitForStepResult({
        name: "run node fork",
      });
      const trueNode1Result = await instance.waitForStepResult({
        name: "run node trueNode1",
      });
      const trueNode2Result = await instance.waitForStepResult({
        name: "run node trueNode2",
      });
      const falseNodeResult = await instance.waitForStepResult({
        name: "run node falseNode",
      });

      console.log("Fork result:", JSON.stringify(forkResult, null, 2));
      console.log(
        "True node 1 result:",
        JSON.stringify(trueNode1Result, null, 2)
      );
      console.log(
        "True node 2 result:",
        JSON.stringify(trueNode2Result, null, 2)
      );
      console.log(
        "False node result:",
        JSON.stringify(falseNodeResult, null, 2)
      );

      expect((forkResult as any).status).toBe("completed");
      expect((trueNode1Result as any).status).toBe("completed");
      expect((trueNode2Result as any).status).toBe("completed");
      expect((falseNodeResult as any).status).toBe("skipped");
      expect((falseNodeResult as any).skipReason).toBe("conditional_branch");
    });

    it("should error when join receives both inputs", async () => {
      const workflow: Workflow = {
        id: "test-workflow-join-both",
        name: "Join Both Inputs Error",
        handle: "join-both",
        type: "manual",
        nodes: [
          {
            id: "num1",
            name: "Number 1",
            type: "number-input",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "value", type: "number", value: 10, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "num2",
            name: "Number 2",
            type: "number-input",
            position: { x: 0, y: 100 },
            inputs: [
              { name: "value", type: "number", value: 20, hidden: true },
            ],
            outputs: [{ name: "value", type: "number" }],
          },
          {
            id: "join",
            name: "Join",
            type: "conditional-join",
            position: { x: 200, y: 50 },
            inputs: [
              { name: "a", type: "any", required: false },
              { name: "b", type: "any", required: false },
            ],
            outputs: [{ name: "result", type: "any" }],
          },
        ],
        edges: [
          {
            source: "num1",
            sourceOutput: "value",
            target: "join",
            targetInput: "a",
          },
          {
            source: "num2",
            sourceOutput: "value",
            target: "join",
            targetInput: "b",
          },
        ],
      };

      const instanceId = createInstanceId("join-both");

      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      await instance.waitForStatus("complete");

      const joinResult = await instance.waitForStepResult({
        name: "run node join",
      });

      console.log(
        "Join result (both inputs error):",
        JSON.stringify(joinResult, null, 2)
      );

      expect(joinResult).toBeDefined();
      expect((joinResult as any).status).toBe("error");
      expect((joinResult as any).error).toContain("both");
    });

    it("should error when join receives neither input", async () => {
      const workflow: Workflow = {
        id: "test-workflow-join-neither",
        name: "Join Neither Input Error",
        handle: "join-neither",
        type: "manual",
        nodes: [
          {
            id: "join",
            name: "Join",
            type: "conditional-join",
            position: { x: 0, y: 0 },
            inputs: [
              { name: "a", type: "any", required: false },
              { name: "b", type: "any", required: false },
            ],
            outputs: [{ name: "result", type: "any" }],
          },
        ],
        edges: [],
      };

      const instanceId = createInstanceId("join-neither");

      await using instance = await introspectWorkflowInstance(
        (env as Bindings).EXECUTE,
        instanceId
      );

      await (env as Bindings).EXECUTE.create({
        id: instanceId,
        params: createParams(workflow),
      });

      await instance.waitForStatus("complete");

      const joinResult = await instance.waitForStepResult({
        name: "run node join",
      });

      console.log(
        "Join result (neither input error):",
        JSON.stringify(joinResult, null, 2)
      );

      expect(joinResult).toBeDefined();
      expect((joinResult as any).status).toBe("error");
      expect((joinResult as any).error).toContain("neither");
    });
  });