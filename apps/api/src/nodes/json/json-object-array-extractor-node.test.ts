import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonObjectArrayExtractorNode } from "./json-object-array-extractor-node";

describe("JsonObjectArrayExtractorNode", () => {
  it("should extract object from simple path", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      profile: {
        age: 30,
        email: "john@example.com",
        settings: {
          theme: "dark",
          notifications: true,
        },
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.profile",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({
      age: 30,
      email: "john@example.com",
      settings: {
        theme: "dark",
        notifications: true,
      },
    });
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract array from simple path", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      scores: [85, 92, 78, 95],
      friends: ["Alice", "Bob", "Charlie"],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.scores",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual([85, 92, 78, 95]);
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract nested object from complex path", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
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
        path: "$.data.users[0].profile",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({
      name: "Alice",
      contact: {
        email: "alice@example.com",
        phone: "123-456-7890",
      },
    });
    expect(result.outputs?.found).toBe(true);
  });

  it("should extract array of objects", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      books: [
        { title: "Book 1", author: "Author 1", year: 2020 },
        { title: "Book 2", author: "Author 2", year: 2021 },
        { title: "Book 3", author: "Author 3", year: 2022 },
      ],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.books",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual([
      { title: "Book 1", author: "Author 1", year: 2020 },
      { title: "Book 2", author: "Author 2", year: 2021 },
      { title: "Book 3", author: "Author 3", year: 2022 },
    ]);
    expect(result.outputs?.found).toBe(true);
  });

  it("should return default value when object/array not found", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
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
        path: "$.profile",
        defaultValue: { default: "value" },
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({ default: "value" });
    expect(result.outputs?.found).toBe(false);
  });

  it("should return empty object as default when no default provided", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
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
        path: "$.profile",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({});
    expect(result.outputs?.found).toBe(false);
  });

  it("should find first object/array value in array", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      items: [
        { type: "string", value: "hello" },
        { type: "object", value: { key: "value" } },
        { type: "number", value: 42 },
        { type: "array", value: [1, 2, 3] },
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
    expect(result.outputs?.value).toEqual({ key: "value" });
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle null JSON input", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: null,
        path: "$.profile",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle invalid JSON input", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: "not an object",
        path: "$.profile",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle missing path", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = { profile: { name: "John" } };
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
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = { profile: { name: "John" } };
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

  it("should not find object/array when path points to primitive value", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
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
        path: "$.name",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({});
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle empty object", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = {};
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.profile",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({});
    expect(result.outputs?.found).toBe(false);
  });

  it("should handle empty array", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      items: [],
      data: {
        users: [],
        settings: {},
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.items",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual([]);
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle complex nested structure", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
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
              preferences: {
                theme: "dark",
                notifications: true,
                language: "en",
              },
            },
            roles: ["admin", "user"],
          },
          {
            id: 2,
            profile: {
              name: "Bob",
              contact: {
                email: "bob@example.com",
                phone: "098-765-4321",
              },
              preferences: {
                theme: "light",
                notifications: false,
                language: "es",
              },
            },
            roles: ["user"],
          },
        ],
        metadata: {
          total: 2,
          lastUpdated: "2023-12-01",
        },
      },
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.data.users[0]",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({
      id: 1,
      profile: {
        name: "Alice",
        contact: {
          email: "alice@example.com",
          phone: "123-456-7890",
        },
        preferences: {
          theme: "dark",
          notifications: true,
          language: "en",
        },
      },
      roles: ["admin", "user"],
    });
    expect(result.outputs?.found).toBe(true);
  });

  it("should handle null values in arrays", async () => {
    const nodeId = "json-object-array-extractor";
    const node = new JsonObjectArrayExtractorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      items: [
        { id: 1, data: { name: "Item 1" } },
        null,
        { id: 3, data: { name: "Item 3" } },
      ],
    };
    const context = {
      nodeId,
      inputs: {
        json,
        path: "$.items[0]",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.value).toEqual({
      id: 1,
      data: { name: "Item 1" },
    });
    expect(result.outputs?.found).toBe(true);
  });
});
