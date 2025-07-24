import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonEditorNode } from "./json-editor-node";

describe("JsonEditorNode", () => {
  it("should execute with valid JSON string", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const validJson = '{"name": "John", "age": 30, "active": true}';
    const context = {
      nodeId,
      inputs: {
        value: validJson,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({
      name: "John",
      age: 30,
      active: true,
    });
  });

  it("should execute with empty object JSON", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const emptyJson = "{}";
    const context = {
      nodeId,
      inputs: {
        value: emptyJson,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({});
  });

  it("should execute with array JSON", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const arrayJson = '[1, 2, 3, "test", {"nested": "value"}]';
    const context = {
      nodeId,
      inputs: {
        value: arrayJson,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual([
      1,
      2,
      3,
      "test",
      { nested: "value" },
    ]);
  });

  it("should execute with primitive values", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const primitiveJson = '"simple string"';
    const context = {
      nodeId,
      inputs: {
        value: primitiveJson,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("simple string");
  });

  it("should handle invalid JSON string", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const invalidJson = '{"name": "John", "age": 30,}'; // Missing value
    const context = {
      nodeId,
      inputs: {
        value: invalidJson,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle malformed JSON with unclosed brackets", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const malformedJson = '{"name": "John"';
    const context = {
      nodeId,
      inputs: {
        value: malformedJson,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle empty string input", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const emptyString = "";
    const context = {
      nodeId,
      inputs: {
        value: emptyString,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle null input", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: null,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle undefined input", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: undefined,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle complex nested JSON", async () => {
    const nodeId = "json-editor";
    const node = new JsonEditorNode({
      nodeId,
    } as unknown as Node);

    const complexJson = `{
      "user": {
        "id": 123,
        "profile": {
          "name": "John Doe",
          "email": "john@example.com",
          "preferences": {
            "theme": "dark",
            "notifications": true
          }
        },
        "roles": ["admin", "user"],
        "metadata": {
          "created": "2023-01-01",
          "lastLogin": "2023-12-01"
        }
      },
      "settings": {
        "enabled": true,
        "timeout": 5000
      }
    }`;
    const context = {
      nodeId,
      inputs: {
        value: complexJson,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({
      user: {
        id: 123,
        profile: {
          name: "John Doe",
          email: "john@example.com",
          preferences: {
            theme: "dark",
            notifications: true,
          },
        },
        roles: ["admin", "user"],
        metadata: {
          created: "2023-01-01",
          lastLogin: "2023-12-01",
        },
      },
      settings: {
        enabled: true,
        timeout: 5000,
      },
    });
  });
});
