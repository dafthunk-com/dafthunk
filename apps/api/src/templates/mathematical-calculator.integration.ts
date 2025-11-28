import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../context";
import { AdditionNode } from "../nodes/math/addition-node";
import { MultiplicationNode } from "../nodes/math/multiplication-node";
import { NumberInputNode } from "../nodes/math/number-input-node";

import { mathematicalCalculatorTemplate } from "./mathematical-calculator";

describe("Mathematical Calculator Template", () => {
  it("should have correct node types defined", () => {
    expect(mathematicalCalculatorTemplate.nodes).toHaveLength(4);
    expect(mathematicalCalculatorTemplate.edges).toHaveLength(4);

    const nodeTypes = mathematicalCalculatorTemplate.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("number-input");
    expect(nodeTypes).toContain("addition");
    expect(nodeTypes).toContain("multiplication");
  });

  it("should execute all nodes in the template", async () => {
    // Execute number input nodes
    const number1Node = mathematicalCalculatorTemplate.nodes.find(
      (n) => n.id === "number-1"
    )!;
    const number1Instance = new NumberInputNode({
      ...number1Node,
      inputs: number1Node.inputs.map((input) =>
        input.name === "value" ? { ...input, value: 10 } : input
      ),
    });
    const number1Result = await number1Instance.execute({
      nodeId: number1Node.id,
      inputs: { value: 10 },
      env: env as Bindings,
    } as any);
    expect(number1Result.status).toBe("completed");
    expect(number1Result.outputs?.value).toBe(10);

    const number2Node = mathematicalCalculatorTemplate.nodes.find(
      (n) => n.id === "number-2"
    )!;
    const number2Instance = new NumberInputNode({
      ...number2Node,
      inputs: number2Node.inputs.map((input) =>
        input.name === "value" ? { ...input, value: 5 } : input
      ),
    });
    const number2Result = await number2Instance.execute({
      nodeId: number2Node.id,
      inputs: { value: 5 },
      env: env as Bindings,
    } as any);
    expect(number2Result.status).toBe("completed");
    expect(number2Result.outputs?.value).toBe(5);

    // Execute addition node
    const additionNode = mathematicalCalculatorTemplate.nodes.find(
      (n) => n.id === "addition-1"
    )!;
    const additionInstance = new AdditionNode(additionNode);
    const additionResult = await additionInstance.execute({
      nodeId: additionNode.id,
      inputs: {
        a: number1Result.outputs?.value,
        b: number2Result.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(additionResult.status).toBe("completed");
    expect(additionResult.outputs?.result).toBe(15); // 10 + 5

    // Execute multiplication node
    const multiplicationNode = mathematicalCalculatorTemplate.nodes.find(
      (n) => n.id === "multiplication-1"
    )!;
    const multiplicationInstance = new MultiplicationNode(multiplicationNode);
    const multiplicationResult = await multiplicationInstance.execute({
      nodeId: multiplicationNode.id,
      inputs: {
        a: number1Result.outputs?.value,
        b: number2Result.outputs?.value,
      },
      env: env as Bindings,
    } as any);
    expect(multiplicationResult.status).toBe("completed");
    expect(multiplicationResult.outputs?.result).toBe(50); // 10 * 5
  });
});
