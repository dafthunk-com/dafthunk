import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SliderInputNode } from "./slider-input-node";

describe("SliderInputNode", () => {
  it("should return default min value when no value provided", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(0);
  });

  it("should return the provided value within range", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 50,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(50);
  });

  it("should constrain value to minimum", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: -10,
        min: 0,
        max: 100,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(0);
  });

  it("should constrain value to maximum", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 150,
        min: 0,
        max: 100,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(100);
  });

  it("should round to nearest step", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 47,
        min: 0,
        max: 100,
        step: 10,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(50);
  });

  it("should handle custom min/max/step values", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 7.5,
        min: 0,
        max: 10,
        step: 0.5,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(7.5);
  });

  it("should handle string inputs that can be converted to numbers", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "75",
        min: "0",
        max: "100",
        step: "5",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(75);
  });

  it("should return error for invalid min/max/step parameters", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        min: "invalid",
        max: 100,
        step: 1,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Invalid input parameters: min, max, and step must be numbers"
    );
  });

  it("should return error when min is greater than or equal to max", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        min: 10,
        max: 5,
        step: 1,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Min value must be less than max value");
  });

  it("should return error for invalid step value", async () => {
    const nodeId = "slider";
    const node = new SliderInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        min: 0,
        max: 100,
        step: 0,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Step value must be greater than 0");
  });
});
