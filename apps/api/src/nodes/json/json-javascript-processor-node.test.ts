import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { JsonJavascriptProcessorNode } from "./json-javascript-processor-node";

describe("JsonJavascriptProcessorNode", () => {
  it("should execute simple JavaScript with JSON input", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      name: "John",
      age: 30,
      scores: [85, 92, 78],
    };
    const javascript = "json.name + ' is ' + json.age + ' years old'";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("John is 30 years old");
    expect(result.outputs?.error).toBe(null);
  });

  it("should execute JavaScript that returns an object", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      user: {
        name: "Alice",
        age: 25,
        preferences: {
          theme: "dark",
          language: "en",
        },
      },
    };
    const javascript = `{
      name: json.user.name,
      age: json.user.age,
      theme: json.user.preferences.theme,
      isAdult: json.user.age >= 18
    }`;
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      name: "Alice",
      age: 25,
      theme: "dark",
      isAdult: true,
    });
    expect(result.outputs?.error).toBe(null);
  });

  it("should execute JavaScript that returns an array", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      numbers: [1, 2, 3, 4, 5],
      names: ["Alice", "Bob", "Charlie"],
    };
    const javascript = "json.numbers.map(n => n * 2).filter(n => n > 5)";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual([6, 8, 10]);
    expect(result.outputs?.error).toBe(null);
  });

  it("should execute JavaScript with mathematical operations", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      prices: [10.99, 24.5, 15.75, 8.25],
      tax: 0.08,
    };
    const javascript = `{
      total: json.prices.reduce((sum, price) => sum + price, 0),
      average: json.prices.reduce((sum, price) => sum + price, 0) / json.prices.length,
      withTax: json.prices.reduce((sum, price) => sum + price, 0) * (1 + json.tax)
    }`;
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      total: 59.49,
      average: 14.8725,
      withTax: 64.2492,
    });
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle missing JSON input", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const javascript = "json.name";
    const context = {
      nodeId,
      inputs: {
        json: null,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle undefined JSON input", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const javascript = "json.name";
    const context = {
      nodeId,
      inputs: {
        json: undefined,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle missing JavaScript input", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const context = {
      nodeId,
      inputs: {
        json,
        javascript: "",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle null JavaScript input", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const context = {
      nodeId,
      inputs: {
        json,
        javascript: null,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle undefined JavaScript input", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const context = {
      nodeId,
      inputs: {
        json,
        javascript: undefined,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle JavaScript syntax errors", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const javascript = "json.name + ; // syntax error";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle JavaScript runtime errors", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const javascript = "json.nonExistentProperty.someMethod()";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle complex JavaScript with functions", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      users: [
        { name: "Alice", age: 25, score: 85 },
        { name: "Bob", age: 30, score: 92 },
        { name: "Charlie", age: 28, score: 78 },
      ],
    };
    const javascript = `{
      totalUsers: json.users.length,
      averageAge: json.users.reduce((sum, user) => sum + user.age, 0) / json.users.length,
      topScorer: json.users.reduce((top, user) => user.score > top.score ? user : top),
      names: json.users.map(user => user.name)
    }`;
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      totalUsers: 3,
      averageAge: 27.666666666666668,
      topScorer: { name: "Bob", age: 30, score: 92 },
      names: ["Alice", "Bob", "Charlie"],
    });
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle JavaScript that returns null", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const javascript = "null";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(null);
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle JavaScript that returns undefined", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = { name: "John" };
    const javascript = "undefined";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(undefined);
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle JavaScript that returns a boolean", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      user: {
        age: 25,
        verified: true,
        premium: false,
      },
    };
    const javascript =
      "json.user.age >= 18 && json.user.verified && !json.user.premium";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(true);
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle JavaScript that returns a number", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      numbers: [1, 2, 3, 4, 5],
    };
    const javascript = "json.numbers.reduce((sum, num) => sum + num, 0)";
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(15);
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle JavaScript with string manipulation", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      message: "Hello World",
      name: "John Doe",
    };
    const javascript = `{
      upperMessage: json.message.toUpperCase(),
      lowerName: json.name.toLowerCase(),
      nameLength: json.name.length,
      words: json.message.split(' ')
    }`;
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      upperMessage: "HELLO WORLD",
      lowerName: "john doe",
      nameLength: 8,
      words: ["Hello", "World"],
    });
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle JavaScript with date operations", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      timestamp: "2023-12-01T10:30:00Z",
      user: {
        name: "Alice",
        joinDate: "2023-01-15",
      },
    };
    const javascript = `{
      currentYear: new Date().getFullYear(),
      joinYear: new Date(json.user.joinDate).getFullYear(),
      yearsSinceJoin: new Date().getFullYear() - new Date(json.user.joinDate).getFullYear(),
      timestamp: new Date(json.timestamp).toISOString()
    }`;
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toHaveProperty("currentYear");
    expect(result.outputs?.result).toHaveProperty("joinYear", 2023);
    expect(result.outputs?.result).toHaveProperty("yearsSinceJoin");
    expect(result.outputs?.result).toHaveProperty("timestamp");
    expect(result.outputs?.error).toBe(null);
  });

  it("should handle JavaScript with array operations", async () => {
    const nodeId = "json-javascript-processor";
    const node = new JsonJavascriptProcessorNode({
      nodeId,
    } as unknown as Node);

    const json = {
      items: [
        { id: 1, name: "Apple", price: 1.99, category: "fruit" },
        { id: 2, name: "Banana", price: 0.99, category: "fruit" },
        { id: 3, name: "Bread", price: 2.49, category: "bakery" },
        { id: 4, name: "Milk", price: 3.99, category: "dairy" },
      ],
    };
    const javascript = `{
      totalItems: json.items.length,
      fruitItems: json.items.filter(item => item.category === 'fruit'),
      averagePrice: json.items.reduce((sum, item) => sum + item.price, 0) / json.items.length,
      categories: [...new Set(json.items.map(item => item.category))],
      expensiveItems: json.items.filter(item => item.price > 2.0)
    }`;
    const context = {
      nodeId,
      inputs: {
        json,
        javascript,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      totalItems: 4,
      fruitItems: [
        { id: 1, name: "Apple", price: 1.99, category: "fruit" },
        { id: 2, name: "Banana", price: 0.99, category: "fruit" },
      ],
      averagePrice: 2.365,
      categories: ["fruit", "bakery", "dairy"],
      expensiveItems: [
        { id: 3, name: "Bread", price: 2.49, category: "bakery" },
        { id: 4, name: "Milk", price: 3.99, category: "dairy" },
      ],
    });
    expect(result.outputs?.error).toBe(null);
  });
});
