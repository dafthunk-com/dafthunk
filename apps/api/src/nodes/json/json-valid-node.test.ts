import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { JsonValidNode } from "./json-valid-node";

describe("JsonValidNode", () => {
  const nodeId = "json-valid";
  const node = new JsonValidNode({
    nodeId,
  } as unknown as Node);

  const createContext = (inputs: Record<string, any>): NodeContext =>
    ({
      nodeId: "test",
      inputs,
      workflowId: "test",
      organizationId: "test-org",
      mode: "dev" as const,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  describe("execute", () => {
    it("should validate simple object", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "John", "age": 30}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        name: "John",
        age: 30,
      });
    });

    it("should validate array", async () => {
      const result = await node.execute(
        createContext({
          value: '["apple", "banana", "cherry"]',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual(["apple", "banana", "cherry"]);
    });

    it("should validate nested object", async () => {
      const result = await node.execute(
        createContext({
          value: '{"user": {"name": "John", "age": 30}}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        user: {
          name: "John",
          age: 30,
        },
      });
    });

    it("should validate complex structure", async () => {
      const result = await node.execute(
        createContext({
          value:
            '{"users": [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        users: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 },
        ],
      });
    });

    it("should validate with different data types", async () => {
      const result = await node.execute(
        createContext({
          value:
            '{"string": "test", "number": 42, "boolean": true, "null": null, "array": [1, 2, 3]}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        string: "test",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
      });
    });

    it("should validate empty object", async () => {
      const result = await node.execute(
        createContext({
          value: "{}",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({});
    });

    it("should validate empty array", async () => {
      const result = await node.execute(
        createContext({
          value: "[]",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual([]);
    });

    it("should validate with whitespace", async () => {
      const result = await node.execute(
        createContext({
          value: '  {  "name"  :  "John"  ,  "age"  :  30  }  ',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        name: "John",
        age: 30,
      });
    });

    it("should validate with escaped characters", async () => {
      const result = await node.execute(
        createContext({
          value: '{"message": "Hello\\nWorld", "path": "C:\\\\Users\\\\John"}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        message: "Hello\nWorld",
        path: "C:\\Users\\John",
      });
    });

    it("should validate with unicode characters", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "José", "city": "São Paulo", "emoji": "🎉"}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        name: "José",
        city: "São Paulo",
        emoji: "🎉",
      });
    });

    it("should validate with scientific notation", async () => {
      const result = await node.execute(
        createContext({
          value: '{"large": 1.23e+10, "small": 1.23e-10}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(true);
      expect(result.outputs?.parsed).toEqual({
        large: 1.23e10,
        small: 1.23e-10,
      });
    });

    it("should reject invalid JSON - missing quote", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "John, "age": 30}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should reject invalid JSON - missing comma", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "John" "age": 30}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should reject invalid JSON - trailing comma", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "John", "age": 30,}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should reject invalid JSON - unclosed bracket", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "John", "age": 30',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should reject invalid JSON - undefined value", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "John", "age": undefined}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should reject invalid JSON - single quotes", async () => {
      const result = await node.execute(
        createContext({
          value: "{'name': 'John', 'age': 30}",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should reject invalid JSON - comments", async () => {
      const result = await node.execute(
        createContext({
          value: '{"name": "John", // comment\n"age": 30}',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should reject invalid JSON - trailing comma in array", async () => {
      const result = await node.execute(
        createContext({
          value: '["apple", "banana",]',
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle null input", async () => {
      const result = await node.execute(
        createContext({
          value: null,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle undefined input", async () => {
      const result = await node.execute(
        createContext({
          value: undefined,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle non-string input", async () => {
      const result = await node.execute(
        createContext({
          value: 42,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle object input", async () => {
      const result = await node.execute(
        createContext({
          value: { key: "value" },
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle array input", async () => {
      const result = await node.execute(
        createContext({
          value: [1, 2, 3],
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle boolean input", async () => {
      const result = await node.execute(
        createContext({
          value: true,
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle empty string", async () => {
      const result = await node.execute(
        createContext({
          value: "",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });

    it("should handle whitespace only string", async () => {
      const result = await node.execute(
        createContext({
          value: "   ",
        })
      );

      expect(result.status).toBe("completed");
      expect(result.outputs?.isValid).toBe(false);
      expect(result.outputs?.error).toBeDefined();
    });
  });
});
