import type { NodeContext } from "@dafthunk/runtime";
import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { FormResponseNode } from "./form-response-node";

const schema: Schema = {
  name: "order",
  fields: [
    { name: "orderId", type: "string", required: true },
    { name: "total", type: "number" },
    { name: "paid", type: "boolean" },
  ],
};

function createContext(inputs: Record<string, unknown>): NodeContext {
  return {
    nodeId: "test",
    organizationId: "org-1",
    inputs,
  } as unknown as NodeContext;
}

describe("FormResponseNode", () => {
  const node = () =>
    new FormResponseNode({ nodeId: "test" } as unknown as Node);

  it("composes a record from the field inputs", async () => {
    const result = await node().execute(
      createContext({ schema, orderId: "A-1", total: 42, paid: true })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs).toEqual({
      record: { orderId: "A-1", total: 42, paid: true },
    });
  });

  it("fills missing fields with null", async () => {
    const result = await node().execute(
      createContext({ schema, orderId: "A-2" })
    );

    expect(result.outputs).toEqual({
      record: { orderId: "A-2", total: null, paid: null },
    });
  });

  it("errors when no schema is selected", async () => {
    const result = await node().execute(createContext({ orderId: "A-3" }));
    expect(result.status).toBe("error");
  });
});
