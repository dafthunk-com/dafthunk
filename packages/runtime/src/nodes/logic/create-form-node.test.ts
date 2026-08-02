import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CreateFormNode } from "./create-form-node";

describe("CreateFormNode", () => {
  const nodeId = "create-form";
  const node = new CreateFormNode({ id: nodeId } as unknown as Node);

  const schema = { fields: [{ name: "email", type: "string" }] };

  const createContext = (
    inputs: Record<string, unknown>,
    overrides: Record<string, unknown> = {}
  ): NodeContext =>
    ({
      nodeId,
      inputs,
      executionId: "exec-1",
      workflowId: "wf-1",
      env: {
        FORM_SIGNING_KEY: "test-signing-key",
        WEB_HOST: "https://app.example.com",
      },
      ...overrides,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("returns a signed form URL, its token and the schema", async () => {
    const result = await node.execute(
      createContext({ title: "Sign up", description: "Please fill in", schema })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.url).toMatch(
      /^https:\/\/app\.example\.com\/form\/.+/
    );
    expect(typeof result.outputs?.token).toBe("string");
    expect(JSON.parse(result.outputs?.schema as string)).toEqual({
      title: "Sign up",
      description: "Please fill in",
      fields: schema.fields,
    });
  });

  it("does not bill the workflow for creating a form", async () => {
    const result = await node.execute(
      createContext({ title: "Sign up", schema })
    );

    expect(result.usage).toBe(0);
  });

  it("errors when the title is missing", async () => {
    const result = await node.execute(createContext({ schema }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Title is required");
  });

  it("errors when the schema has no fields", async () => {
    const result = await node.execute(
      createContext({ title: "Sign up", schema: { fields: [] } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("Schema with at least one field is required");
  });

  it("errors outside a workflow execution", async () => {
    const result = await node.execute(
      createContext({ title: "Sign up", schema }, { executionId: undefined })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("requires workflow execution");
  });

  it("errors when the form signing configuration is missing", async () => {
    const result = await node.execute(
      createContext(
        { title: "Sign up", schema },
        { env: { WEB_HOST: "https://app.example.com" } }
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Form configuration missing");
  });

  it("errors on a field with no name", async () => {
    const result = await node.execute(
      createContext({
        title: "Sign up",
        schema: { fields: [{ type: "string" }] },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain('must have a "name" and "type"');
  });

  it("errors on an unsupported field type", async () => {
    const result = await node.execute(
      createContext({
        title: "Sign up",
        schema: { fields: [{ name: "x", type: "quaternion" }] },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain('Invalid field type "quaternion"');
  });
});
