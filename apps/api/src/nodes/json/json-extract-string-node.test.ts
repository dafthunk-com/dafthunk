import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonExtractStringNode } from "./json-extract-string-node";

describe("JsonStringExtractorNode", () => {
  it("should extract string value from simple path", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.name",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("John Doe");
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract string value from nested path", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      user: {
        profile: {
          name: "Jane Smith",
          email: "jane@example.com",
        },
        settings: {
          theme: "dark",
        },
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.user.profile.name",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("Jane Smith");
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract string value from array path", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      books: [
        { title: "Book 1", author: "Author 1" },
        { title: "Book 2", author: "Author 2" },
      ],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.books[0].title",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("Book 1");
    expect(result.outputs?.found).toBe(true);
  });

  it("should return default value when string not found", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.email",
        defaultValue: "default@example.com",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("default@example.com");
    expect(result.outputs?.found).toBe(false);
  });

  it("should return empty string as default when no default provided", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.email",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("");
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle null JSON input", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: null,
        path: "$.name",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("");
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle invalid JSON input", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: "not an object",
        path: "$.name",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle missing path", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle null path", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const context = {
      nodeId,
      inputs: {
        json,
        path: null,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should find first string value in array", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      items: [
        { type: "number", value: 42 },
        { type: "string", value: "hello" },
        { type: "boolean", value: true },
        { type: "string", value: "world" },
      ],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.items[*].value",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("hello");
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle complex nested structure", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      data: {
        users: [
          {
            id: 1,
            profile: {
              name: "Alice",
              contact: {
                email: "alice@example.com",
                phone: "123-456-7890",
              },
            },
          },
          {
            id: 2,
            profile: {
              name: "Bob",
              contact: {
                email: "bob@example.com",
                phone: "098-765-4321",
              },
            },
          },
        ],
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.data.users[1].profile.contact.email",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("bob@example.com");
    expect(result.outputs?.found).toBe(true);
  });

  it("should not find string when path points to non-string value", async () => {
    const nodeId = "json-string-extractor";
    const node = new JsonExtractStringNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
      active: true,
      settings: { theme: "dark" },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.age",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toBe("");
    expect(result.outputs?.found).toBe(false);
  });
});
