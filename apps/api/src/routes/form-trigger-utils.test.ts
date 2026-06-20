import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { findFormResponse, findFormTrigger } from "./form-trigger-utils";

function node(type: string, inputs: { name: string; value?: unknown }[]): Node {
  return {
    id: "n1",
    name: type,
    type,
    position: { x: 0, y: 0 },
    inputs: inputs.map((i) => ({
      name: i.name,
      type: "string",
      value: i.value,
    })),
    outputs: [],
  } as unknown as Node;
}

describe("findFormTrigger", () => {
  it("reads a request trigger with a schema id, title and description", () => {
    const nodes = [
      node("form-request", [
        { name: "schema", value: "schema-123" },
        { name: "title", value: "Sign up" },
        { name: "description", value: "Join us" },
      ]),
    ];

    expect(findFormTrigger(nodes)).toEqual({
      mode: "request",
      schemaRef: "schema-123",
      title: "Sign up",
      description: "Join us",
    });
  });

  it("maps the webhook node to async mode", () => {
    const nodes = [node("form-webhook", [{ name: "schema", value: "s1" }])];
    expect(findFormTrigger(nodes)?.mode).toBe("webhook");
  });

  it("accepts an inline schema object", () => {
    const inline = { name: "x", fields: [{ name: "a", type: "string" }] };
    const nodes = [node("form-request", [{ name: "schema", value: inline }])];
    expect(findFormTrigger(nodes)?.schemaRef).toEqual(inline);
  });

  it("returns null when there is no form trigger node", () => {
    expect(findFormTrigger([node("http-request", [])])).toBeNull();
  });

  it("returns null when the schema is not set", () => {
    const nodes = [node("form-request", [{ name: "schema" }])];
    expect(findFormTrigger(nodes)).toBeNull();
  });

  it("omits empty title/description", () => {
    const nodes = [
      node("form-webhook", [
        { name: "schema", value: "s1" },
        { name: "title", value: "" },
      ]),
    ];
    const result = findFormTrigger(nodes);
    expect(result).not.toHaveProperty("title");
    expect(result).not.toHaveProperty("description");
  });
});

describe("findFormResponse", () => {
  it("reads the response node id and schema ref", () => {
    const nodes = [
      node("form-request", [{ name: "schema", value: "s1" }]),
      node("form-response", [{ name: "schema", value: "schema-456" }]),
    ];
    expect(findFormResponse(nodes)).toEqual({
      nodeId: "n1",
      schemaRef: "schema-456",
    });
  });

  it("accepts an inline schema object", () => {
    const inline = { name: "x", fields: [{ name: "a", type: "string" }] };
    const nodes = [node("form-response", [{ name: "schema", value: inline }])];
    expect(findFormResponse(nodes)?.schemaRef).toEqual(inline);
  });

  it("returns null when there is no response node", () => {
    expect(findFormResponse([node("form-request", [])])).toBeNull();
  });

  it("returns null when the schema is not set", () => {
    expect(findFormResponse([node("form-response", [])])).toBeNull();
  });
});
