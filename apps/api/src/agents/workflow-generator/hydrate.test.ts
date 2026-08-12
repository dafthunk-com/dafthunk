import { describe, expect, it } from "vitest";

import type { GeneratedWorkflowDraft } from "./draft-types";
import {
  AGENT,
  FIXTURE_NODE_TYPES,
  RECEIVE_SCHEDULED,
  TEXT_INPUT,
} from "./fixtures";
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

  it("keeps what it disarmed, so `arm` has something to restore", () => {
    // The real registry ships `scheduleExpression` with a default value; the
    // fixture does not, so mirror that here. Without the collection, "turn it
    // on" would have nothing to write back — hydration deleted the schedule
    // on purpose, and this is the only copy.
    const armedScheduled = {
      ...RECEIVE_SCHEDULED,
      inputs: [
        { name: "scheduleExpression", type: "string", value: "0 0 * * *" },
      ],
    } as typeof RECEIVE_SCHEDULED;
    const nodeTypes = FIXTURE_NODE_TYPES.map((nodeType) =>
      nodeType.type === RECEIVE_SCHEDULED.type ? armedScheduled : nodeType
    );

    const { workflow, disarmed } = hydrateGeneratedWorkflow(
      draft({ trigger: "scheduled" }),
      nodeTypes,
      nodeTypes
    );

    expect(disarmed).toEqual([
      {
        nodeId: TRIGGER_NODE_ID,
        inputName: "scheduleExpression",
        value: "0 0 * * *",
      },
    ]);

    // And the graph itself really is dormant — the value lives only in the
    // collection, never in what gets saved.
    const trigger = workflow.nodes.find((n) => n.id === TRIGGER_NODE_ID);
    expect(
      trigger?.inputs.find((i) => i.name === "scheduleExpression")?.value
    ).toBeUndefined();
  });

  it("collects nothing when no arming value was present", () => {
    const { disarmed } = hydrateGeneratedWorkflow(
      draft({ trigger: "scheduled" }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );
    expect(disarmed).toEqual([]);
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
      { ownerEmail: "owner@example.com" }
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
      { ownerEmail: "owner@example.com" }
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
      { ownerEmail: "owner@example.com" }
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

describe("binding org-owned resources", () => {
  const queryDraft = draft({
    title: "Report",
    nodes: [{ id: "q", type: "database-execute", inputs: { sql: "select 1" } }],
  });

  const databaseOf = (workflow: {
    nodes: Array<{ inputs: Array<{ name: string; value?: unknown }> }>;
  }) =>
    workflow.nodes[0]?.inputs.find((input) => input.name === "databaseId")
      ?.value;

  it("binds the workspace database the model could never have named", () => {
    const { workflow, boundResources } = hydrateGeneratedWorkflow(
      queryDraft,
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { orgResources: { database: [{ id: "db1", name: "Main" }] } }
    );

    expect(databaseOf(workflow)).toBe("db1");
    // Reported, so a workspace with several databases can see which was used.
    expect(boundResources).toEqual([{ type: "database", name: "Main" }]);
  });

  /**
   * A form trigger declares no outputs; its ports are the bound schema's
   * fields. Until hydration derived them, a bound form arrived at validation
   * with nothing to wire — every edge off it fatal, and unfixable, because the
   * repair prompt could only offer "its outputs are: none".
   */
  describe("a form trigger's derived ports", () => {
    const formDraft = draft({ title: "Enquiry", trigger: "form_webhook" });

    const enquirySchema = {
      id: "sch1",
      name: "Enquiry",
      fields: [
        { name: "email", type: "string" as const },
        { name: "age", type: "integer" as const },
      ],
    };

    it("comes from the fields of the schema it was bound to", () => {
      const { workflow } = hydrateGeneratedWorkflow(
        formDraft,
        FIXTURE_NODE_TYPES,
        FIXTURE_NODE_TYPES,
        { orgResources: { schema: [enquirySchema] } }
      );

      const trigger = workflow.nodes.find((n) => n.id === TRIGGER_NODE_ID);

      expect(trigger?.outputs.map((o) => o.name)).toEqual(["email", "age"]);
      // Field types are mapped, not copied: `integer` is not a parameter type.
      expect(trigger?.outputs.map((o) => o.type)).toEqual(["string", "number"]);
    });

    it("stays empty when the schema has no fields to derive from", () => {
      const { workflow } = hydrateGeneratedWorkflow(
        formDraft,
        FIXTURE_NODE_TYPES,
        FIXTURE_NODE_TYPES,
        { orgResources: { schema: [{ id: "sch1", name: "Enquiry" }] } }
      );

      expect(
        workflow.nodes.find((n) => n.id === TRIGGER_NODE_ID)?.outputs
      ).toEqual([]);
    });

    it("derives the input side too, for a node that composes a record", () => {
      // The mirror image: `json-schema-compose` declares only its schema and
      // grows one input per field. Without this, a graph writing a form
      // submission into a table failed on UNKNOWN_INPUT_PORT every round.
      const composeDraft = draft({
        title: "Store it",
        nodes: [{ id: "c", type: "json-schema-compose" }],
      });

      const { workflow } = hydrateGeneratedWorkflow(
        composeDraft,
        FIXTURE_NODE_TYPES,
        FIXTURE_NODE_TYPES,
        { orgResources: { schema: [enquirySchema] } }
      );

      const compose = workflow.nodes.find(
        (n) => n.type === "json-schema-compose"
      );

      expect(compose?.inputs.map((i) => i.name)).toEqual([
        // The schema input stays: it is what bound the resource.
        "schema",
        "email",
        "age",
      ]);
      // The declared output is untouched — only one side is derived.
      expect(compose?.outputs.map((o) => o.name)).toEqual(["record"]);
    });

    it("does not rewrite the ports of a node that merely takes a schema", () => {
      // `database-execute` takes a schema to coerce its results. Deriving its
      // outputs from those fields would be nonsense, so the rule is gated on
      // the node being a trigger that declares no outputs of its own.
      const queryWithSchema = draft({
        title: "Report",
        nodes: [
          { id: "q", type: "database-execute", inputs: { sql: "select 1" } },
        ],
      });

      const { workflow } = hydrateGeneratedWorkflow(
        queryWithSchema,
        FIXTURE_NODE_TYPES,
        FIXTURE_NODE_TYPES,
        {
          orgResources: {
            database: [{ id: "db1", name: "Main" }],
            schema: [enquirySchema],
          },
        }
      );

      const query = workflow.nodes.find((n) => n.type === "database-execute");

      expect(query?.outputs.map((o) => o.name)).not.toEqual(["email", "age"]);
    });
  });

  it("leaves the input alone when the workspace owns none", () => {
    const { workflow, boundResources } = hydrateGeneratedWorkflow(
      queryDraft,
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { orgResources: { database: [] } }
    );

    expect(databaseOf(workflow)).toBeUndefined();
    expect(boundResources).toEqual([]);
  });

  it("prefers an explicit binding over the oldest fallback", () => {
    const { workflow, boundResources } = hydrateGeneratedWorkflow(
      queryDraft,
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      {
        orgResources: {
          database: [
            { id: "db1", name: "Main" },
            { id: "db2", name: "Analytics" },
          ],
        },
        bindings: { database: { id: "db2", name: "Analytics" } },
      }
    );

    expect(databaseOf(workflow)).toBe("db2");
    expect(boundResources).toEqual([{ type: "database", name: "Analytics" }]);
  });

  /**
   * The safety property, asserted end to end: the oldest-fallback must never
   * reach an arming type, or saving the workflow would mark the queue trigger
   * active before anyone had reviewed it.
   */
  it("never binds a resource that would arm a trigger by fallback", () => {
    const { workflow, boundResources } = hydrateGeneratedWorkflow(
      draft({
        title: "Enqueue",
        nodes: [
          { id: "s", type: "send-queue-message", inputs: { body: "hi" } },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { orgResources: { queue: [{ id: "q1", name: "Jobs" }] } }
    );

    const queueId = workflow.nodes[0]?.inputs.find(
      (input) => input.name === "queueId"
    )?.value;
    expect(queueId).toBeUndefined();
    expect(boundResources).toEqual([]);
  });

  it("binds an arming type on a mid-graph node when chosen explicitly", () => {
    // `syncTriggers` reads resource ids only off the trigger node, so a queue
    // on a mid-graph send arms nothing — and an explicit choice is exactly
    // the review the blanket exclusion existed to force.
    const { workflow, boundResources } = hydrateGeneratedWorkflow(
      draft({
        title: "Enqueue",
        nodes: [
          { id: "s", type: "send-queue-message", inputs: { body: "hi" } },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { bindings: { queue: { id: "q1", name: "Jobs" } } }
    );

    const queueId = workflow.nodes[0]?.inputs.find(
      (input) => input.name === "queueId"
    )?.value;
    expect(queueId).toBe("q1");
    expect(boundResources).toEqual([{ type: "queue", name: "Jobs" }]);
  });

  it("binds the connected account onto an integration input", () => {
    const { workflow, boundIntegrations } = hydrateGeneratedWorkflow(
      draft({
        title: "Post",
        nodes: [{ id: "p", type: "share-post-x", inputs: { text: "hi" } }],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { integrations: new Map([["x", { id: "int-1", name: "Work account" }]]) }
    );

    const bound = workflow.nodes[0]?.inputs.find(
      (input) => input.name === "integrationId"
    )?.value;
    expect(bound).toBe("int-1");
    // Reported: a workflow quietly wired to somebody's real account is the
    // one binding they must be told about.
    expect(boundIntegrations).toEqual([
      { provider: "x", name: "Work account" },
    ]);
  });

  it("never overwrites an integration id already on the node", () => {
    const { workflow, boundIntegrations } = hydrateGeneratedWorkflow(
      draft({
        title: "Post",
        nodes: [
          {
            id: "p",
            type: "share-post-x",
            inputs: { text: "hi", integrationId: "int-explicit" },
          },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { integrations: new Map([["x", { id: "int-1", name: "Work account" }]]) }
    );

    const bound = workflow.nodes[0]?.inputs.find(
      (input) => input.name === "integrationId"
    )?.value;
    // An adopted workflow's explicit account choice wins over the fallback.
    expect(bound).toBe("int-explicit");
    expect(boundIntegrations).toEqual([]);
  });

  it("leaves an unconnected provider unbound, with nothing reported", () => {
    const { workflow, errors, boundIntegrations } = hydrateGeneratedWorkflow(
      draft({
        title: "Post",
        nodes: [{ id: "p", type: "share-post-x", inputs: { text: "hi" } }],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { integrations: new Map([["slack", { id: "s1", name: "Team" }]]) }
    );

    const bound = workflow.nodes[0]?.inputs.find(
      (input) => input.name === "integrationId"
    )?.value;
    // Unbound is a valid state now: the rehearsal stubs the node, and the
    // outcome screen offers the connection.
    expect(bound).toBeUndefined();
    expect(errors).toEqual([]);
    expect(boundIntegrations).toEqual([]);
  });

  it("moves an explicit trigger-node binding into `disarmed`, not the graph", () => {
    // Bound, but never armed behind the user's back: the mailbox lands in the
    // disarmed collection, the saved graph stays inert, and the `arm` turn is
    // what writes it back.
    const { workflow, disarmed } = hydrateGeneratedWorkflow(
      draft({ title: "Triage", trigger: "email_message", nodes: [] }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES,
      { bindings: { email: { id: "em1", name: "support" } } }
    );

    const trigger = workflow.nodes.find((n) => n.id === TRIGGER_NODE_ID);
    expect(
      trigger?.inputs.find((input) => input.name === "email")?.value
    ).toBeUndefined();
    expect(disarmed).toEqual([
      { nodeId: TRIGGER_NODE_ID, inputName: "email", value: "em1" },
    ]);
  });

  it("merges trigger configuration from the draft, then disarms it", () => {
    // The model does not own the trigger node, but the cron line behind
    // "every morning at 8" has nowhere else to come from. It arrives via a
    // draft node with the trigger's fixed id, and ends up in `disarmed` —
    // the copy the `arm` turn restores.
    const { workflow, disarmed } = hydrateGeneratedWorkflow(
      draft({
        title: "Digest",
        trigger: "scheduled",
        nodes: [
          {
            id: TRIGGER_NODE_ID,
            type: "receive-scheduled-trigger",
            inputs: { scheduleExpression: "0 8 * * *" },
          },
        ],
      }),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    const trigger = workflow.nodes.find((n) => n.id === TRIGGER_NODE_ID);
    expect(
      trigger?.inputs.find((input) => input.name === "scheduleExpression")
        ?.value
    ).toBeUndefined();
    expect(disarmed).toEqual([
      {
        nodeId: TRIGGER_NODE_ID,
        inputName: "scheduleExpression",
        value: "0 8 * * *",
      },
    ]);
  });
});

/**
 * Tools are the one input the model writes that the canvas never shows.
 *
 * The rest of hydration materializes ports the model is not trusted to
 * describe; this is the reverse — an input it *is* trusted to choose, checked
 * against an allowlist on the way in.
 */
describe("agent tools", () => {
  const agentDraft = (tools: unknown) =>
    draft({
      title: "Digest",
      nodes: [
        {
          id: "agent",
          type: AGENT.type,
          inputs: { input: "Summarize the top stories", tools },
        },
      ],
    });

  const toolsOf = (workflow: {
    nodes: Array<{
      id: string;
      inputs: Array<{ name: string; value?: unknown }>;
    }>;
  }) =>
    workflow.nodes
      .find((node) => node.id === "agent")
      ?.inputs.find((input) => input.name === "tools")?.value;

  const maxStepsOf = (workflow: {
    nodes: Array<{
      id: string;
      inputs: Array<{ name: string; value?: unknown }>;
    }>;
  }) =>
    workflow.nodes
      .find((node) => node.id === "agent")
      ?.inputs.find((input) => input.name === "max_steps")?.value;

  it("keeps an allowlisted tool the model asked for", () => {
    const { workflow, errors } = hydrateGeneratedWorkflow(
      agentDraft([{ type: "node", identifier: "fetch" }]),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toHaveLength(0);
    expect(toolsOf(workflow)).toEqual([{ type: "node", identifier: "fetch" }]);
  });

  it("raises the step ceiling for an agent that has tools", () => {
    const { workflow } = hydrateGeneratedWorkflow(
      agentDraft(["fetch"]),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(maxStepsOf(workflow)).toBe(20);
  });

  /**
   * Fatal, not silent. An agent with nothing to call cannot go and look
   * anything up, and it will not report that — it will answer from what it
   * already knows, which is the fabrication this whole line of work exists to
   * stop.
   */
  it("refuses a tool that is not on the allowlist", () => {
    const { workflow, errors } = hydrateGeneratedWorkflow(
      agentDraft([{ type: "node", identifier: "send-email" }]),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("UNKNOWN_TOOL");
    expect(errors[0].severity).toBe("fatal");
    expect(errors[0].fix).toContain("fetch");
    expect(toolsOf(workflow)).toEqual([]);
  });

  it("warns rather than fails when a usable tool survives", () => {
    const { errors } = hydrateGeneratedWorkflow(
      agentDraft(["fetch", "send-email"]),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("UNKNOWN_TOOL");
    expect(errors[0].severity).toBe("warning");
  });

  it("leaves a toolless agent alone", () => {
    const { workflow, errors } = hydrateGeneratedWorkflow(
      agentDraft(undefined),
      FIXTURE_NODE_TYPES,
      FIXTURE_NODE_TYPES
    );

    expect(errors).toHaveLength(0);
    expect(toolsOf(workflow)).toEqual([]);
    expect(maxStepsOf(workflow)).toBe(10);
  });
});
