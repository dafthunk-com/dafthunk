import type { NodeContext } from "@dafthunk/runtime";
import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ReceiveFormRequestNode } from "./receive-form-request-node";
import { ReceiveFormWebhookNode } from "./receive-form-webhook-node";

const schema: Schema = {
  name: "signup",
  fields: [
    { name: "name", type: "string", required: true },
    { name: "age", type: "integer" },
    { name: "avatar", type: "image" },
  ],
};

const reference = { id: "obj-1", mimeType: "image/png", filename: "a.png" };

function createContext(
  inputs: Record<string, unknown>,
  record?: Record<string, unknown>
): NodeContext {
  return {
    nodeId: "test",
    organizationId: "org-1",
    inputs,
    ...(record ? { formSubmission: { record, timestamp: 0 } } : {}),
  } as unknown as NodeContext;
}

describe.each([
  ["ReceiveFormRequestNode", ReceiveFormRequestNode],
  ["ReceiveFormWebhookNode", ReceiveFormWebhookNode],
])("%s", (_name, NodeClass) => {
  const node = () => new NodeClass({ nodeId: "test" } as unknown as Node);

  it("emits one typed output per schema field, passing blobs through", async () => {
    const context = createContext(
      { schema },
      { name: "Alice", age: 30, avatar: reference }
    );

    const result = await node().execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs).toEqual({
      name: "Alice",
      age: 30,
      avatar: reference,
    });
  });

  it("fills missing fields with null", async () => {
    const context = createContext({ schema }, { name: "Bob" });

    const result = await node().execute(context);

    expect(result.outputs).toEqual({ name: "Bob", age: null, avatar: null });
  });

  it("errors when no schema is selected", async () => {
    const result = await node().execute(createContext({}, {}));
    expect(result.status).toBe("error");
  });

  it("treats a missing form submission as an empty record", async () => {
    const result = await node().execute(createContext({ schema }));
    expect(result.outputs).toEqual({ name: null, age: null, avatar: null });
  });
});
