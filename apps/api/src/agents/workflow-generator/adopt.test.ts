import type { Node, Parameter, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { workflowToDraft } from "./adopt";
import { enrichValidation } from "./enrich-validation";
import { FIXTURE_NODE_TYPES } from "./fixtures/node-types";
import {
  hydrateGeneratedWorkflow,
  RESPONDER_NODE_ID,
  TRIGGER_NODE_ID,
} from "./hydrate";

function param(
  name: string,
  value?: unknown,
  extra: Partial<Parameter> = {}
): Parameter {
  return {
    name,
    type: "string",
    ...(value !== undefined && { value }),
    ...extra,
  } as Parameter;
}

function node(id: string, type: string, inputs: Parameter[] = []): Node {
  return {
    id,
    name: type,
    type,
    position: { x: 0, y: 0 },
    inputs,
    outputs: [],
  } as Node;
}

function workflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "wf-1",
    name: "My Workflow",
    trigger: "manual",
    nodes: [],
    edges: [],
    ...overrides,
  };
}

describe("workflowToDraft", () => {
  it("preserves ids, types, names and literals — hidden values included", () => {
    const stored = workflow({
      description: "does things",
      nodes: [
        node("text-input-aaa", "text-input", [param("value", "hello")]),
        node("agent-bbb", "agent-claude-sonnet-4", [
          // Connected input: no value in the stored shape, must not appear.
          param("input"),
          // Hidden inputs are user data on input-widget and agent nodes — the
          // template projection drops them; adoption must not.
          param("max_steps", 10, { hidden: true }),
          param("tools", [], { hidden: true }),
        ]),
      ],
      edges: [
        {
          source: "text-input-aaa",
          sourceOutput: "value",
          target: "agent-bbb",
          targetInput: "input",
        },
      ],
    });

    const draft = workflowToDraft(stored);

    expect(draft.title).toBe("My Workflow");
    expect(draft.description).toBe("does things");
    expect(draft.trigger).toBe("manual");
    expect(draft.steps).toEqual([]);
    expect(draft.nodes).toEqual([
      {
        id: "text-input-aaa",
        type: "text-input",
        name: "text-input",
        inputs: { value: "hello" },
      },
      {
        id: "agent-bbb",
        type: "agent-claude-sonnet-4",
        name: "agent-claude-sonnet-4",
        inputs: { max_steps: 10, tools: [] },
      },
    ]);
    expect(draft.edges).toEqual(stored.edges);
  });

  it("renames the trigger node and its edges to hydration's fixed id", () => {
    const stored = workflow({
      trigger: "scheduled",
      nodes: [
        node("receive-scheduled-trigger-xyz", "receive-scheduled-trigger", [
          param("scheduleExpression", "0 8 * * *"),
        ]),
        node("to-string-1", "to-string"),
      ],
      edges: [
        {
          source: "receive-scheduled-trigger-xyz",
          sourceOutput: "timestamp",
          target: "to-string-1",
          targetInput: "value",
        },
      ],
    });

    const draft = workflowToDraft(stored);

    const trigger = draft.nodes.find((n) => n.id === TRIGGER_NODE_ID);
    expect(trigger).toMatchObject({
      type: "receive-scheduled-trigger",
      inputs: { scheduleExpression: "0 8 * * *" },
    });
    expect(draft.edges).toEqual([
      {
        source: TRIGGER_NODE_ID,
        sourceOutput: "timestamp",
        target: "to-string-1",
        targetInput: "value",
      },
    ]);
  });

  it("renames the responder for request/response triggers", () => {
    const stored = workflow({
      trigger: "http_request",
      nodes: [
        node("http-request-abc", "http-request"),
        node("http-response-def", "http-response"),
      ],
      edges: [
        {
          source: "http-request-abc",
          sourceOutput: "body",
          target: "http-response-def",
          targetInput: "body",
        },
      ],
    });

    const draft = workflowToDraft(stored);

    expect(draft.nodes.map((n) => n.id)).toEqual([
      TRIGGER_NODE_ID,
      RESPONDER_NODE_ID,
    ]);
    expect(draft.edges).toEqual([
      {
        source: TRIGGER_NODE_ID,
        sourceOutput: "body",
        target: RESPONDER_NODE_ID,
        targetInput: "body",
      },
    ]);
  });

  it("round-trips through hydration with arming values captured", () => {
    const stored = workflow({
      trigger: "scheduled",
      nodes: [
        node("receive-scheduled-trigger-xyz", "receive-scheduled-trigger", [
          param("scheduleExpression", "0 8 * * *"),
        ]),
        node("to-string-1", "to-string"),
        node("output-text-1", "output-text"),
      ],
      edges: [
        {
          source: "receive-scheduled-trigger-xyz",
          sourceOutput: "timestamp",
          target: "to-string-1",
          targetInput: "value",
        },
        {
          source: "to-string-1",
          sourceOutput: "result",
          target: "output-text-1",
          targetInput: "value",
        },
      ],
    });

    const {
      workflow: hydrated,
      errors,
      disarmed,
    } = hydrateGeneratedWorkflow(
      workflowToDraft(stored),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toEqual([]);
    // The cron line rode the renamed trigger node into hydration, was merged
    // onto the injected node, and disarm collected it — this is the whole
    // pause-and-re-arm contract for adopted workflows.
    expect(disarmed).toEqual([
      {
        nodeId: TRIGGER_NODE_ID,
        inputName: "scheduleExpression",
        value: "0 8 * * *",
      },
    ]);
    expect(
      hydrated.edges.some(
        (e) => e.source === TRIGGER_NODE_ID && e.target === "to-string-1"
      )
    ).toBe(true);
    expect(enrichValidation(hydrated, FIXTURE_NODE_TYPES)).toEqual([]);
  });

  it("survives hydration for request/response graphs without losing the responder", () => {
    const stored = workflow({
      trigger: "http_request",
      nodes: [
        node("http-request-abc", "http-request"),
        node("http-response-def", "http-response"),
      ],
      edges: [
        {
          source: "http-request-abc",
          sourceOutput: "body",
          target: "http-response-def",
          targetInput: "body",
        },
      ],
    });

    const { workflow: hydrated, errors } = hydrateGeneratedWorkflow(
      workflowToDraft(stored),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toEqual([]);
    expect(
      hydrated.edges.some(
        (e) => e.source === TRIGGER_NODE_ID && e.target === RESPONDER_NODE_ID
      )
    ).toBe(true);
    // MISSING_RESPONDER is exactly what a dropped responder edge produces.
    expect(enrichValidation(hydrated, FIXTURE_NODE_TYPES)).toEqual([]);
  });

  it("drops a second trigger-typed node at hydration — the pinned degradation", () => {
    const stored = workflow({
      trigger: "scheduled",
      nodes: [
        node("receive-scheduled-trigger-1", "receive-scheduled-trigger", [
          param("scheduleExpression", "0 8 * * *"),
        ]),
        // A hand-built oddity: a second trigger node. It has no fixed id to
        // claim, so hydration discards it and every edge touching it.
        node("receive-scheduled-trigger-2", "receive-scheduled-trigger"),
        node("to-string-1", "to-string"),
        node("output-text-1", "output-text"),
      ],
      edges: [
        {
          source: "receive-scheduled-trigger-1",
          sourceOutput: "timestamp",
          target: "to-string-1",
          targetInput: "value",
        },
        {
          source: "receive-scheduled-trigger-2",
          sourceOutput: "timestamp",
          target: "to-string-1",
          targetInput: "value",
        },
        {
          source: "to-string-1",
          sourceOutput: "result",
          target: "output-text-1",
          targetInput: "value",
        },
      ],
    });

    const { workflow: hydrated } = hydrateGeneratedWorkflow(
      workflowToDraft(stored),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    const triggerNodes = hydrated.nodes.filter(
      (n) => n.type === "receive-scheduled-trigger"
    );
    expect(triggerNodes).toHaveLength(1);
    expect(triggerNodes[0].id).toBe(TRIGGER_NODE_ID);
    expect(
      hydrated.edges.some((e) => e.source === "receive-scheduled-trigger-2")
    ).toBe(false);
  });
});
