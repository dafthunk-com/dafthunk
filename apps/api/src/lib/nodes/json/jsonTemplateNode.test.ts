import { describe, it, expect } from "vitest";
import { JsonTemplateNode } from "./jsonTemplateNode";
import { Node } from "../../runtime/types";

describe("JsonTemplateNode", () => {
  const createNode = (inputs: Record<string, any> = {}): Node => ({
    id: "test-node",
    type: "jsonTemplate",
    name: "Test Node",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
    ...inputs,
  });

  const createContext = (inputs: Record<string, any> = {}) => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    inputs,
  });

  it("should replace variables in a simple JSON object", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: {
          name: "${firstName} ${lastName}",
          age: "${age}",
        },
        variables: {
          firstName: "John",
          lastName: "Doe",
          age: 30,
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toEqual({
      name: "John Doe",
      age: "30",
    });
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle nested JSON objects", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: {
          user: {
            name: "${name}",
            contact: {
              email: "${email}",
              phone: "${phone}",
            },
          },
          settings: {
            theme: "${theme}",
          },
        },
        variables: {
          name: "John Doe",
          email: "john@example.com",
          phone: "+1234567890",
          theme: "dark",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toEqual({
      user: {
        name: "John Doe",
        contact: {
          email: "john@example.com",
          phone: "+1234567890",
        },
      },
      settings: {
        theme: "dark",
      },
    });
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle arrays with template variables", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: {
          items: [
            { name: "${item1}", price: "${price1}" },
            { name: "${item2}", price: "${price2}" },
          ],
        },
        variables: {
          item1: "Apple",
          price1: 1.99,
          item2: "Banana",
          price2: 0.99,
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toEqual({
      items: [
        { name: "Apple", price: "1.99" },
        { name: "Banana", price: "0.99" },
      ],
    });
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should report missing variables", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: {
          name: "${firstName} ${lastName}",
          email: "${email}",
        },
        variables: {
          firstName: "John",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toEqual({
      name: "John ${lastName}",
      email: "${email}",
    });
    expect(result.outputs?.missingVariables.getValue()).toEqual([
      "lastName",
      "email",
    ]);
  });

  it("should handle null and undefined values", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: {
          name: "${name}",
          age: "${age}",
          email: "${email}",
        },
        variables: {
          name: null,
          age: undefined,
          email: "test@example.com",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toEqual({
      name: "",
      age: "",
      email: "test@example.com",
    });
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle non-string values in template", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: {
          name: "${name}",
          age: 25,
          isActive: true,
          scores: [1, 2, 3],
        },
        variables: {
          name: "John Doe",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.outputs?.result.getValue()).toEqual({
      name: "John Doe",
      age: 25,
      isActive: true,
      scores: [1, 2, 3],
    });
    expect(result.outputs?.missingVariables.getValue()).toEqual([]);
  });

  it("should handle invalid template input", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: "not an object",
        variables: {},
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing template object");
  });

  it("should handle invalid variables input", async () => {
    const node = new JsonTemplateNode(createNode());
    const result = await node.execute(
      createContext({
        template: { name: "${name}" },
        variables: "not an object",
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid or missing variables object");
  });
});
