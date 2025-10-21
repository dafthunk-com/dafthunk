import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { FormDataNumberNode } from "./form-data-number-node";

describe("FormDataNumberNode", () => {
  it("should parse integer string as number", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "42",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe(42);
  });

  it("should parse decimal string as number", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "3.14",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(3.14);
  });

  it("should parse negative number", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "-10.5",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(-10.5);
  });

  it("should parse zero", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "0",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(0);
  });

  it("should parse number value directly", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: 123,
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(123);
  });

  it("should handle required parameter when missing", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {},
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("testParam");
    expect(result.error).toContain("required");
  });

  it("should handle optional parameter when missing", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: false },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {},
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeUndefined();
  });

  it("should handle missing HTTP request when required", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("HTTP request information is required");
  });

  it("should handle missing HTTP request when optional", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: false },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeUndefined();
  });

  it("should handle invalid number value", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "not-a-number",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("valid number");
  });

  it("should handle empty string as invalid number", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("valid number");
  });

  it("should handle missing parameter name", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "42",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Parameter name is required");
  });

  it("should parse scientific notation", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "1.23e-4",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(0.000123);
  });

  it("should parse Infinity", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "Infinity",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(Infinity);
  });

  it("should parse -Infinity", async () => {
    const nodeId = "form-data-number";
    const node = new FormDataNumberNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "-Infinity",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(-Infinity);
  });
});
