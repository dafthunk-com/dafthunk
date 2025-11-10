import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { FormDataBooleanNode } from "./form-data-boolean-node";

describe("FormDataBooleanNode", () => {
  it("should parse 'true' string as true", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: "true",
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
    expect(result.outputs?.value).toBe(true);
  });

  it("should parse 'false' string as false", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: "false",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(false);
  });

  it("should parse '1' string as true", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: "1",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });

  it("should parse '0' string as false", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
    expect(result.outputs?.value).toBe(false);
  });

  it("should parse 'yes' string as true", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: "yes",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });

  it("should parse 'no' string as false", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: "no",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(false);
  });

  it("should parse boolean value directly", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: true,
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });

  it("should parse number value (non-zero as true)", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: 5,
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });

  it("should parse number value (zero as false)", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: 0,
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(false);
  });

  it("should handle case insensitive parsing", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: "TRUE",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });

  it("should handle required parameter when missing", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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

  it("should handle invalid boolean value", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
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
          testParam: "invalid",
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("valid boolean value");
  });

  it("should handle missing parameter name", async () => {
    const nodeId = "form-data-boolean";
    const node = new FormDataBooleanNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "true",
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
});
