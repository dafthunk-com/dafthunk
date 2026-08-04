import { describe, expect, it } from "vitest";

import type { GeneratedWorkflowDraft } from "./draft-types";
import { FIXTURE_NODE_TYPES, RECEIVE_SCHEDULED, TEXT_INPUT } from "./fixtures";
import {
  hydrateGeneratedWorkflow,
  normalizeTrigger,
  RESPONDER_NODE_ID,
  TRIGGER_NODE_ID,
} from "./hydrate";

function draft(overrides: Partial<GeneratedWorkflowDraft> = {}) {
  return {
    title: "Test",
    description: "",
    trigger: "manual",
    steps: [],
    nodes: [],
    edges: [],
    ...overrides,
  } as GeneratedWorkflowDraft;
}

describe("normalizeTrigger", () => {
  it("accepts the canonical values", () => {
    expect(normalizeTrigger("email_message")).toBe("email_message");
    expect(normalizeTrigger("manual")).toBe("manual");
  });

  it("maps the aliases a model is likely to emit", () => {
    expect(normalizeTrigger("webhook")).toBe("http_webhook");
    expect(normalizeTrigger("cron")).toBe("scheduled");
    expect(normalizeTrigger("email")).toBe("email_message");
    expect(normalizeTrigger("Slack")).toBe("slack_event");
  });

  it("rejects anything else", () => {
    expect(normalizeTrigger("carrier-pigeon")).toBeUndefined();
  });
});

describe("hydrateGeneratedWorkflow", () => {
  it("materializes full ports from the registry", () => {
    const { workflow, errors } = hydrateGeneratedWorkflow(
      draft({
        nodes: [{ id: "a", type: "text-input", inputs: { value: "hello" } }],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toHaveLength(0);
    const node = workflow.nodes.find((n) => n.id === "a");
    expect(node?.inputs.map((i) => i.name)).toEqual(
      TEXT_INPUT.inputs.map((i) => i.name)
    );
    expect(node?.outputs.map((o) => o.name)).toEqual(["value"]);
    expect(node?.inputs.find((i) => i.name === "value")?.value).toBe("hello");
  });

  it("reports an unknown node type with near-miss suggestions", () => {
    const { errors } = hydrateGeneratedWorkflow(
      draft({ nodes: [{ id: "a", type: "text-inputs-node" }] }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("UNKNOWN_NODE_TYPE");
    expect(errors[0].fix).toContain("text-input");
  });

  it("synthesizes dynamic inputs the edges reach for", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      draft({
        nodes: [
          { id: "a", type: "text-input", inputs: { value: "x" } },
          { id: "b", type: "text-input", inputs: { value: "y" } },
          {
            id: "t",
            type: "var-string-template",
            inputs: { template: "${var_1} ${var_2}" },
          },
        ],
        edges: [
          {
            source: "a",
            sourceOutput: "value",
            target: "t",
            targetInput: "var_1",
          },
          {
            source: "b",
            sourceOutput: "value",
            target: "t",
            targetInput: "var_2",
          },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    const template = workflow.nodes.find((n) => n.id === "t");
    expect(template?.inputs.map((i) => i.name)).toContain("var_2");
    expect(template?.inputs.find((i) => i.name === "var_2")?.type).toBe(
      "string"
    );
  });

  it("injects the trigger node with a fixed id and drops model-emitted ones", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      draft({
        trigger: "email_message",
        nodes: [
          { id: "my-trigger", type: "receive-email" },
          { id: "out", type: "output-text" },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    const triggers = workflow.nodes.filter((n) => n.type === "receive-email");
    expect(triggers).toHaveLength(1);
    expect(triggers[0].id).toBe(TRIGGER_NODE_ID);
  });

  it("pairs a responder with the request trigger", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      draft({ trigger: "http_request" }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(workflow.nodes.map((n) => n.id)).toEqual([
      TRIGGER_NODE_ID,
      RESPONDER_NODE_ID,
    ]);
  });

  it("strips a schedule expression so saving cannot arm a live cron", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      draft({
        trigger: "scheduled",
        nodes: [
          {
            id: TRIGGER_NODE_ID,
            type: RECEIVE_SCHEDULED.type,
            inputs: { scheduleExpression: "*/5 * * * *" },
          },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    const trigger = workflow.nodes.find((n) => n.id === TRIGGER_NODE_ID);
    expect(
      trigger?.inputs.find((i) => i.name === "scheduleExpression")?.value
    ).toBeUndefined();
  });

  it("lays nodes out in topological layers", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      draft({
        nodes: [
          { id: "a", type: "text-input", inputs: { value: "x" } },
          { id: "b", type: "output-text" },
        ],
        edges: [
          {
            source: "a",
            sourceOutput: "value",
            target: "b",
            targetInput: "value",
          },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    const a = workflow.nodes.find((n) => n.id === "a");
    const b = workflow.nodes.find((n) => n.id === "b");
    expect(a?.position.x).toBe(0);
    expect(b?.position.x).toBe(400);
  });

  it("drops edges whose endpoints did not survive", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      draft({
        nodes: [{ id: "a", type: "text-input", inputs: { value: "x" } }],
        edges: [
          {
            source: "a",
            sourceOutput: "value",
            target: "ghost",
            targetInput: "value",
          },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(workflow.edges).toHaveLength(0);
  });

  it("fails fast on an unrecognizable trigger", () => {
    const { errors } = hydrateGeneratedWorkflow(
      draft({ trigger: "carrier-pigeon" as never }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors[0].code).toBe("TRIGGER_INVALID");
  });
});

describe("the send-email recipient", () => {
  const draft = {
    title: "Digest",
    description: "",
    trigger: "manual" as const,
    steps: [],
    nodes: [
      { id: "text", type: "text-input", inputs: { value: "hi" } },
      { id: "mail", type: "send-email", inputs: { subject: "Digest" } },
    ],
    edges: [
      {
        source: "text",
        sourceOutput: "value",
        target: "mail",
        targetInput: "text",
      },
    ],
  };

  const recipientOf = (workflow: {
    nodes: Array<{
      type: string;
      inputs: Array<{ name: string; value?: unknown }>;
    }>;
  }) =>
    workflow.nodes
      .find((node) => node.type === "send-email")
      ?.inputs.find((input) => input.name === "to")?.value;

  it("is filled in by the server when nobody else set it", () => {
    // The model never sees who is asking, so without this the node has no
    // recipient and fails the moment it runs.
    const { workflow } = hydrateGeneratedWorkflow(
      draft,
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      "owner@example.com"
    );
    expect(recipientOf(workflow)).toBe("owner@example.com");
  });

  it("leaves a recipient the model chose alone", () => {
    // `send-email` is also how a workflow replies to a customer. Overriding a
    // deliberate recipient would silently redirect someone else's mail.
    const { workflow } = hydrateGeneratedWorkflow(
      {
        ...draft,
        nodes: [
          draft.nodes[0],
          {
            ...draft.nodes[1],
            inputs: { subject: "Digest", to: "customer@example.com" },
          },
        ],
      },
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      "owner@example.com"
    );
    expect(recipientOf(workflow)).toBe("customer@example.com");
  });

  it("leaves a recipient fed by an edge alone", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      {
        ...draft,
        edges: [
          ...draft.edges,
          {
            source: "text",
            sourceOutput: "value",
            target: "mail",
            targetInput: "to",
          },
        ],
      },
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      "owner@example.com"
    );
    expect(recipientOf(workflow)).toBeUndefined();
  });

  it("fills nothing when no address was supplied", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      draft,
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );
    expect(recipientOf(workflow)).toBeUndefined();
  });
});
