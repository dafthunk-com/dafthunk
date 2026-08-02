import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CreateFeedbackFormNode } from "./create-feedback-form-node";

describe("CreateFeedbackFormNode", () => {
  const nodeId = "create-feedback-form";
  const node = new CreateFeedbackFormNode({ id: nodeId } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    overrides: Record<string, unknown> = {}
  ): NodeContext =>
    ({
      nodeId,
      inputs,
      executionId: "exec-1",
      workflowId: "wf-1",
      organizationId: "org-1",
      env: {
        FORM_SIGNING_KEY: "test-signing-key",
        WEB_HOST: "https://app.example.com",
      },
      ...overrides,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("returns a signed feedback URL, its token and the form config", async () => {
    const result = await node.execute(
      createContext({ title: "How did we do?", description: "Tell us more" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.url).toMatch(
      /^https:\/\/app\.example\.com\/feedback\/.+/
    );
    expect(typeof result.outputs?.token).toBe("string");
    expect(JSON.parse(result.outputs?.feedbackFormConfig as string)).toEqual({
      title: "How did we do?",
      description: "Tell us more",
    });
  });

  it("does not bill the workflow for creating a form", async () => {
    const result = await node.execute(createContext({ title: "Feedback" }));

    expect(result.usage).toBe(0);
  });

  it("errors when the title is missing", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Title is required");
  });

  it("errors outside a workflow execution", async () => {
    const result = await node.execute(
      createContext({ title: "Feedback" }, { executionId: undefined })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("requires workflow execution");
  });

  it("errors when the form signing configuration is missing", async () => {
    const result = await node.execute(
      createContext({ title: "Feedback" }, { env: { WEB_HOST: "https://a.b" } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Form configuration missing");
  });
});
