import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { FormDataStringNode } from "./form-data-string-node";

describe("FormDataStringNode", () => {
  it("should extract string value from form data", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
          testParam: "hello world",
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("hello world");
  });

  it("should handle empty string", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("");
  });

  it("should handle whitespace-only string", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
          testParam: "   ",
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("   ");
  });

  it("should handle special characters", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
          testParam: "!@#$%^&*()_+-=[]{}|;':\",./<>?",
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("!@#$%^&*()_+-=[]{}|;':\",./<>?");
  });

  it("should handle unicode characters", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
          testParam: "Hello 世界 🌍",
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("Hello 世界 🌍");
  });

  it("should handle required parameter when missing", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("testParam");
    expect(result.error).toContain("required");
  });

  it("should handle optional parameter when missing", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeUndefined();
  });

  it("should handle missing HTTP request when required", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("HTTP request information is required");
  });

  it("should handle missing HTTP request when optional", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: false },
      ],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBeUndefined();
  });

  it("should handle non-string value", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("must be a string");
  });

  it("should handle boolean value", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("must be a string");
  });

  it("should handle missing parameter name", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
      nodeId,
      inputs: [{ name: "required", value: true }],
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: "hello",
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Parameter name is required");
  });

  it("should handle long string", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
      nodeId,
      inputs: [
        { name: "name", value: "testParam" },
        { name: "required", value: true },
      ],
    } as unknown as Node);

    const longString = "a".repeat(10000);
    const context = {
      nodeId,
      inputs: {},
      httpRequest: {
        formData: {
          testParam: longString,
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(longString);
  });

  it("should handle JSON-like string", async () => {
    const nodeId = "form-data-string";
    const node = new FormDataStringNode({
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
          testParam: '{"key": "value", "number": 42}',
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe('{"key": "value", "number": 42}');
  });
});
