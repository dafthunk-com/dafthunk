import { describe, expect, it } from "vitest";

import type { GeneratedWorkflowDraft } from "./draft-types";
import { FIXTURE_NODE_TYPES } from "./fixtures/node-types";
import { deriveSchemaShapes } from "./schema-shapes";

function draft(overrides: Partial<GeneratedWorkflowDraft> = {}) {
  return {
    title: "Enquiry",
    description: "",
    trigger: "manual",
    steps: [],
    nodes: [],
    edges: [],
    ...overrides,
  } as GeneratedWorkflowDraft;
}

describe("deriveSchemaShapes", () => {
  /**
   * A form trigger declares no outputs, so the port names on the edges leaving
   * it are pure intent — nothing in the prompt could have suggested them. That
   * makes them a better account of what the form asks for than any schema the
   * workspace happens to own.
   */
  it("reads a form's fields off the edges leaving its trigger", () => {
    const derived = deriveSchemaShapes({
      draft: draft({
        trigger: "form_webhook",
        nodes: [{ id: "say", type: "output-text" }],
        edges: [
          {
            source: "trigger",
            sourceOutput: "question",
            target: "say",
            targetInput: "value",
          },
        ],
      }),
      nodeTypes: FIXTURE_NODE_TYPES,
    });

    expect(derived).toEqual([
      {
        family: "schema",
        action: "create",
        name: "Enquiry submission",
        nodeId: "trigger",
        // Typed from the port it was wired into, since that is the only
        // statement anybody made about the value.
        fields: [{ name: "question", type: "string" }],
      },
    ]);
  });

  it("reads a composing node's fields off the edges arriving at it", () => {
    const derived = deriveSchemaShapes({
      draft: draft({
        nodes: [
          { id: "text", type: "text-input" },
          { id: "c", type: "json-schema-compose" },
        ],
        edges: [
          {
            source: "text",
            sourceOutput: "value",
            target: "c",
            targetInput: "reply",
          },
        ],
      }),
      nodeTypes: FIXTURE_NODE_TYPES,
    });

    expect(derived).toEqual([
      {
        family: "schema",
        action: "create",
        name: "Enquiry c",
        nodeId: "c",
        fields: [{ name: "reply", type: "string" }],
      },
    ]);
  });

  it("leaves alone the nodes the draft already shaped", () => {
    const derived = deriveSchemaShapes({
      draft: draft({
        trigger: "form_webhook",
        nodes: [{ id: "say", type: "output-text" }],
        edges: [
          {
            source: "trigger",
            sourceOutput: "question",
            target: "say",
            targetInput: "value",
          },
        ],
        resources: [
          {
            family: "schema",
            action: "create",
            name: "Enquiry",
            nodeId: "trigger",
            fields: [{ name: "question", type: "string" }],
          },
        ],
      }),
      nodeTypes: FIXTURE_NODE_TYPES,
    });

    expect(derived).toEqual([]);
  });

  /** Before shapes belonged to nodes, one schema stood for the workflow. */
  it("derives nothing when a shape was declared for the workflow at large", () => {
    const derived = deriveSchemaShapes({
      draft: draft({
        trigger: "form_webhook",
        nodes: [{ id: "say", type: "output-text" }],
        edges: [
          {
            source: "trigger",
            sourceOutput: "question",
            target: "say",
            targetInput: "value",
          },
        ],
        resources: [
          {
            family: "schema",
            action: "create",
            name: "Enquiry",
            fields: [{ name: "question", type: "string" }],
          },
        ],
      }),
      nodeTypes: FIXTURE_NODE_TYPES,
    });

    expect(derived).toEqual([]);
  });

  it("drops port names that could never be field names", () => {
    const derived = deriveSchemaShapes({
      draft: draft({
        trigger: "form_webhook",
        nodes: [{ id: "say", type: "output-text" }],
        edges: [
          {
            source: "trigger",
            sourceOutput: "first name",
            target: "say",
            targetInput: "value",
          },
        ],
      }),
      nodeTypes: FIXTURE_NODE_TYPES,
    });

    // The schemas route refuses a non-identifier and the provisioner drops it,
    // so a shape made only of those is no shape at all.
    expect(derived).toEqual([]);
  });

  it("says nothing about a node whose ports are not its schema's fields", () => {
    const derived = deriveSchemaShapes({
      draft: draft({
        nodes: [
          { id: "q", type: "database-execute", inputs: { sql: "select 1" } },
          { id: "say", type: "output-text" },
        ],
        edges: [
          {
            source: "q",
            sourceOutput: "rows",
            target: "say",
            targetInput: "value",
          },
        ],
      }),
      nodeTypes: FIXTURE_NODE_TYPES,
    });

    expect(derived).toEqual([]);
  });
});
