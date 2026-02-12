import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { JsonTemplateNode } from "./json-template-node";

describe("JsonTemplateNode", () => {
  it("should replace simple variables in template", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      name: "${firstName} ${lastName}",
      age: "${age}",
      email: "${email}",
    };
    const variables = {
      firstName: "John",
      lastName: "Doe",
      age: 30,
      email: "john@example.com",
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      name: "John Doe",
      age: "30",
      email: "john@example.com",
    });
    expect(result.outputs?.missingVariables).toEqual([]);
  });

  it("should replace variables in nested objects", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      user: {
        profile: {
          name: "${firstName} ${lastName}",
          contact: {
            email: "${email}",
            phone: "${phone}",
          },
        },
        settings: {
          theme: "${theme}",
          language: "${language}",
        },
      },
    };
    const variables = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "123-456-7890",
      theme: "dark",
      language: "en",
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      user: {
        profile: {
          name: "Jane Smith",
          contact: {
            email: "jane@example.com",
            phone: "123-456-7890",
          },
        },
        settings: {
          theme: "dark",
          language: "en",
        },
      },
    });
    expect(result.outputs?.missingVariables).toEqual([]);
  });

  it("should replace variables in arrays", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      items: [
        { name: "${item1}", price: "${price1}" },
        { name: "${item2}", price: "${price2}" },
        { name: "${item3}", price: "${price3}" },
      ],
      total: "${total}",
    };
    const variables = {
      item1: "Apple",
      price1: 1.99,
      item2: "Banana",
      price2: 0.99,
      item3: "Orange",
      price3: 2.49,
      total: 5.47,
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      items: [
        { name: "Apple", price: "1.99" },
        { name: "Banana", price: "0.99" },
        { name: "Orange", price: "2.49" },
      ],
      total: "5.47",
    });
    expect(result.outputs?.missingVariables).toEqual([]);
  });

  it("should handle missing variables", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      name: "${firstName} ${lastName}",
      age: "${age}",
      email: "${email}",
      phone: "${phone}",
    };
    const variables = {
      firstName: "John",
      lastName: "Doe",
      age: 30,
      // email and phone are missing
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      name: "John Doe",
      age: "30",
      email: "${email}",
      phone: "${phone}",
    });
    expect(result.outputs?.missingVariables).toEqual(["email", "phone"]);
  });

  it("should handle null and undefined variables", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      name: "${name}",
      description: "${description}",
      tags: "${tags}",
    };
    const variables = {
      name: "Test Item",
      description: null,
      tags: undefined,
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      name: "Test Item",
      description: "",
      tags: "",
    });
    expect(result.outputs?.missingVariables).toEqual([]);
  });

  it("should handle empty template", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {};
    const variables = {
      name: "John",
      age: 30,
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({});
    expect(result.outputs?.missingVariables).toEqual([]);
  });

  it("should handle empty variables", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      name: "${firstName} ${lastName}",
      age: "${age}",
    };
    const variables = {};
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      name: "${firstName} ${lastName}",
      age: "${age}",
    });
    expect(result.outputs?.missingVariables).toEqual([
      "firstName",
      "lastName",
      "age",
    ]);
  });

  it("should handle null template input", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: null,
        variables: { name: "John" },
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle undefined template input", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: undefined,
        variables: { name: "John" },
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle non-object template input", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        template: "not an object",
        variables: { name: "John" },
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle null variables input", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = { name: "${name}" };
    const context = {
      nodeId,
      inputs: {
        template,
        variables: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle undefined variables input", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = { name: "${name}" };
    const context = {
      nodeId,
      inputs: {
        template,
        variables: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle non-object variables input", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = { name: "${name}" };
    const context = {
      nodeId,
      inputs: {
        template,
        variables: "not an object",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle duplicate variables in template", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      name: "${firstName}",
      fullName: "${firstName} ${lastName}",
      greeting: "Hello ${firstName}!",
    };
    const variables = {
      firstName: "John",
      lastName: "Doe",
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      name: "John",
      fullName: "John Doe",
      greeting: "Hello John!",
    });
    expect(result.outputs?.missingVariables).toEqual([]);
  });

  it("should handle complex nested structure with arrays", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      user: {
        id: "${userId}",
        profile: {
          name: "${firstName} ${lastName}",
          email: "${email}",
          preferences: {
            theme: "${theme}",
            language: "${language}",
          },
        },
        roles: ["${role1}", "${role2}"],
        metadata: {
          created: "${createdDate}",
          lastLogin: "${lastLoginDate}",
        },
      },
      settings: {
        enabled: "${enabled}",
        timeout: "${timeout}",
      },
    };
    const variables = {
      userId: 123,
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@example.com",
      theme: "dark",
      language: "en",
      role1: "admin",
      role2: "user",
      createdDate: "2023-01-01",
      lastLoginDate: "2023-12-01",
      enabled: true,
      timeout: 5000,
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      user: {
        id: "123",
        profile: {
          name: "Alice Johnson",
          email: "alice@example.com",
          preferences: {
            theme: "dark",
            language: "en",
          },
        },
        roles: ["admin", "user"],
        metadata: {
          created: "2023-01-01",
          lastLogin: "2023-12-01",
        },
      },
      settings: {
        enabled: "true",
        timeout: "5000",
      },
    });
    expect(result.outputs?.missingVariables).toEqual([]);
  });

  it("should handle variables with special characters", async () => {
    const nodeId = "json-template";
    const node = new JsonTemplateNode({
      nodeId,
    } as unknown as Node);

    const template = {
      message: "Hello ${name}! Your ID is ${userId}.",
      data: {
        "user-id": "${userId}",
        "user-name": "${name}",
        "user-email": "${email}",
      },
    };
    const variables = {
      name: "John Doe",
      userId: "12345",
      email: "john.doe@example.com",
    };
    const context = {
      nodeId,
      inputs: {
        template,
        variables,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      message: "Hello John Doe! Your ID is 12345.",
      data: {
        "user-id": "12345",
        "user-name": "John Doe",
        "user-email": "john.doe@example.com",
      },
    });
    expect(result.outputs?.missingVariables).toEqual([]);
  });
});
