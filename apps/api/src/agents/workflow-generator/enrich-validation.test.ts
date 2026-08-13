import type { Workflow } from "@dafthunk/types";
import { buildNodeFromNodeType } from "@dafthunk/utils";
import { describe, expect, it } from "vitest";

import { enrichValidation, formatErrorsForLLM } from "./enrich-validation";
import {
  BROWSER_MARKDOWN,
  FIXTURE_NODE_TYPES,
  JSON_INPUT,
  OUTPUT_TEXT,
  SEND_EMAIL,
  TEXT_INPUT,
} from "./fixtures/node-types";

function workflowOf(
  nodes: Workflow["nodes"],
  edges: Workflow["edges"]
): Workflow {
  return {
    id: "w",
    name: "test",
    trigger: "manual",
    nodes,
    edges,
  };
}

const jsonInput = buildNodeFromNodeType(JSON_INPUT, {
  id: "src",
  position: { x: 0, y: 0 },
  inputs: { value: {} },
});
const textOutput = buildNodeFromNodeType(OUTPUT_TEXT, {
  id: "sink",
  position: { x: 400, y: 0 },
});
const textInput = buildNodeFromNodeType(TEXT_INPUT, {
  id: "text",
  position: { x: 0, y: 0 },
  inputs: { value: "hi" },
});

describe("enrichValidation", () => {
  it("names the to-string bridge for a json -> string edge", () => {
    const errors = enrichValidation(
      workflowOf(
        [jsonInput, textOutput],
        [
          {
            source: "src",
            sourceOutput: "value",
            target: "sink",
            targetInput: "value",
          },
        ]
      ),
      FIXTURE_NODE_TYPES
    );

    const mismatch = errors.find((e) => e.code === "TYPE_MISMATCH");
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe("fatal");
    expect(mismatch?.fix).toContain("to-string");
    expect(mismatch?.fix).toContain("not a wildcard");
  });

  it("lists the real outputs when the source port does not exist", () => {
    const errors = enrichValidation(
      workflowOf(
        [textInput, textOutput],
        [
          {
            source: "text",
            sourceOutput: "text",
            target: "sink",
            targetInput: "value",
          },
        ]
      ),
      FIXTURE_NODE_TYPES
    );

    const error = errors.find((e) => e.code === "UNKNOWN_OUTPUT_PORT");
    expect(error).toBeDefined();
    expect(error?.fix).toContain("value:string");
  });

  it("lists the real inputs when the target port does not exist", () => {
    const errors = enrichValidation(
      workflowOf(
        [textInput, textOutput],
        [
          {
            source: "text",
            sourceOutput: "value",
            target: "sink",
            targetInput: "input",
          },
        ]
      ),
      FIXTURE_NODE_TYPES
    );

    expect(errors.find((e) => e.code === "UNKNOWN_INPUT_PORT")?.fix).toContain(
      "value:string"
    );
  });

  it("accepts a valid graph", () => {
    const errors = enrichValidation(
      workflowOf(
        [textInput, textOutput],
        [
          {
            source: "text",
            sourceOutput: "value",
            target: "sink",
            targetInput: "value",
          },
        ]
      ),
      FIXTURE_NODE_TYPES
    );

    expect(errors.filter((e) => e.severity === "fatal")).toEqual([]);
  });

  it("flags a required input with neither an edge nor a value", () => {
    const errors = enrichValidation(
      workflowOf([textOutput], []),
      FIXTURE_NODE_TYPES
    );

    expect(errors.some((e) => e.code === "MISSING_REQUIRED_INPUT")).toBe(true);
  });

  it("reports an unconnected node as a warning, not a failure", () => {
    const orphan = buildNodeFromNodeType(TEXT_INPUT, {
      id: "orphan",
      position: { x: 0, y: 0 },
      inputs: { value: "x" },
    });

    const errors = enrichValidation(
      workflowOf(
        [textInput, textOutput, orphan],
        [
          {
            source: "text",
            sourceOutput: "value",
            target: "sink",
            targetInput: "value",
          },
        ]
      ),
      FIXTURE_NODE_TYPES
    );

    const orphanError = errors.find((e) => e.code === "ORPHAN_NODE");
    expect(orphanError?.severity).toBe("warning");
    expect(errors.filter((e) => e.severity === "fatal")).toEqual([]);
  });
});

describe("formatErrorsForLLM", () => {
  it("numbers fatal fixes and omits warnings", () => {
    const text = formatErrorsForLLM([
      {
        code: "TYPE_MISMATCH",
        severity: "fatal",
        message: "m",
        fix: "do the thing",
      },
      {
        code: "ORPHAN_NODE",
        severity: "warning",
        message: "m",
        fix: "ignored",
      },
    ]);

    expect(text).toContain("1. TYPE_MISMATCH");
    expect(text).toContain("do the thing");
    expect(text).not.toContain("ignored");
  });

  it("is empty when nothing is fatal", () => {
    expect(
      formatErrorsForLLM([
        { code: "ORPHAN_NODE", severity: "warning", message: "m", fix: "f" },
      ])
    ).toBe("");
  });
});

describe("the destination contract", () => {
  const emailDestination = {
    id: "email",
    kind: "email" as const,
    label: "email it to you",
    nodeTypes: ["send-email"],
  };
  const displayDestination = {
    id: "display",
    kind: "display" as const,
    label: "show it to you here",
    nodeTypes: ["output-text", "output-json"],
  };

  const sendEmail = buildNodeFromNodeType(SEND_EMAIL, {
    id: "notify",
    position: { x: 400, y: 0 },
    inputs: { to: "owner@example.com", subject: "Digest", text: "..." },
  });

  it("is silent when the workflow delivers what was promised", () => {
    const errors = enrichValidation(
      workflowOf(
        [textInput, textOutput],
        [
          {
            source: "text",
            sourceOutput: "value",
            target: "sink",
            targetInput: "value",
          },
        ]
      ),
      FIXTURE_NODE_TYPES,
      [],
      { destination: displayDestination }
    );

    expect(errors.filter((e) => e.code === "DESTINATION_NOT_REALIZED")).toEqual(
      []
    );
  });

  it("catches the graph that computes an answer and delivers nothing", () => {
    // The reported failure, reduced: a workflow that produces the right value
    // and drops it in a widget when the user asked to be emailed.
    const errors = enrichValidation(
      workflowOf(
        [textInput, textOutput],
        [
          {
            source: "text",
            sourceOutput: "value",
            target: "sink",
            targetInput: "value",
          },
        ]
      ),
      FIXTURE_NODE_TYPES,
      [],
      { destination: emailDestination }
    );

    const found = errors.find((e) => e.code === "DESTINATION_NOT_REALIZED");
    expect(found?.severity).toBe("fatal");
    expect(found?.message).toContain("email it to you");
    // The fix has to name the node type and the port, or the repair round is
    // spent guessing rather than fixing.
    expect(found?.fix).toContain("send-email");
    // The body, not the recipient — advice that says otherwise is worse than
    // no advice, because the model will follow it.
    expect(found?.fix).toContain('"text"');
    expect(found?.fix).not.toContain('"to"');
  });

  it("catches a delivery node left dangling", () => {
    const errors = enrichValidation(
      workflowOf([textInput, sendEmail], []),
      FIXTURE_NODE_TYPES,
      [],
      { destination: emailDestination }
    );

    const found = errors.find((e) => e.code === "DESTINATION_NOT_REALIZED");
    expect(found?.nodeId).toBe("notify");
    expect(found?.message).toContain("nothing to send");
    expect(found?.fix).toContain("no incoming edge");
  });

  it("changes nothing when no destination was promised", () => {
    const workflow = workflowOf([textInput, sendEmail], []);

    // The regression guard for the optional fourth parameter: a generation
    // that never had a brief must validate exactly as it did before.
    expect(enrichValidation(workflow, FIXTURE_NODE_TYPES, [], {})).toEqual(
      enrichValidation(workflow, FIXTURE_NODE_TYPES)
    );
  });
});

describe("inputs where one of several will do", () => {
  const emailWith = (inputs: Record<string, unknown>) =>
    buildNodeFromNodeType(SEND_EMAIL, {
      id: "mail",
      position: { x: 400, y: 0 },
      inputs,
    });

  it("catches an email with no body at all", () => {
    // Ports cannot express "html or text", so this graph satisfies every other
    // rule and still fails at run time. Catching it here costs one repair
    // round instead of a red execution.
    const errors = enrichValidation(
      workflowOf([emailWith({ to: "a@b.c", subject: "Hi" })], []),
      FIXTURE_NODE_TYPES
    );

    const found = errors.find((e) => e.code === "MISSING_ONE_OF_INPUTS");
    expect(found?.severity).toBe("fatal");
    expect(found?.fix).toContain('"html"');
    expect(found?.fix).toContain('"text"');
  });

  it("is satisfied by either one", () => {
    for (const body of ["html", "text"]) {
      const errors = enrichValidation(
        workflowOf(
          [emailWith({ to: "a@b.c", subject: "Hi", [body]: "x" })],
          []
        ),
        FIXTURE_NODE_TYPES
      );
      expect(errors.filter((e) => e.code === "MISSING_ONE_OF_INPUTS")).toEqual(
        []
      );
    }
  });

  it("is satisfied by an edge into one of them", () => {
    const errors = enrichValidation(
      workflowOf(
        [textInput, emailWith({ to: "a@b.c", subject: "Hi" })],
        [
          {
            source: "text",
            sourceOutput: "value",
            target: "mail",
            targetInput: "text",
          },
        ]
      ),
      FIXTURE_NODE_TYPES
    );

    expect(errors.filter((e) => e.code === "MISSING_ONE_OF_INPUTS")).toEqual(
      []
    );
  });

  // An empty string satisfies `!== undefined` and nothing else. Observed as a
  // send-email that validated clean and then failed the run with "'to' and
  // 'subject' are required inputs".
  it("does not accept a blank string as a required value", () => {
    for (const blank of ["", "   "]) {
      const errors = enrichValidation(
        workflowOf([emailWith({ to: blank, subject: "Hi", text: "body" })], []),
        FIXTURE_NODE_TYPES
      );

      const found = errors.find(
        (e) => e.code === "MISSING_REQUIRED_INPUT" && e.message.includes('"to"')
      );
      expect(found?.severity).toBe("fatal");
    }
  });

  // The failure that survived three repair rounds in a real session: a scrape
  // node with nothing to scrape, validated clean, "Either 'url' or 'html' is
  // required" at run time.
  it("catches a browser node with no page to work on", () => {
    const scrape = buildNodeFromNodeType(BROWSER_MARKDOWN, {
      id: "scrape",
      position: { x: 0, y: 0 },
    });

    const found = enrichValidation(
      workflowOf([scrape], []),
      FIXTURE_NODE_TYPES
    ).find((e) => e.code === "MISSING_ONE_OF_INPUTS");

    expect(found?.severity).toBe("fatal");
    expect(found?.fix).toContain('"url"');
  });

  it("accepts a browser node given a url", () => {
    const scrape = buildNodeFromNodeType(BROWSER_MARKDOWN, {
      id: "scrape",
      position: { x: 0, y: 0 },
      inputs: { url: "https://example.com" },
    });

    expect(
      enrichValidation(workflowOf([scrape], []), FIXTURE_NODE_TYPES).filter(
        (e) => e.code === "MISSING_ONE_OF_INPUTS"
      )
    ).toEqual([]);
  });

  it("does not accept a blank string as one of a one-of pair", () => {
    const errors = enrichValidation(
      workflowOf([emailWith({ to: "a@b.c", subject: "Hi", text: "" })], []),
      FIXTURE_NODE_TYPES
    );

    expect(errors.some((e) => e.code === "MISSING_ONE_OF_INPUTS")).toBe(true);
  });
});

/**
 * The generator holds a stricter bar than the shared validator.
 *
 * `validateWorkflow` accepts an empty graph on purpose — it gates the create
 * and update endpoints, where a blank canvas is a legitimate save. A generator
 * that returns nothing has simply failed, and until this check existed the
 * pipeline saved that nothing, ran it and called it a success.
 */
describe("empty generated workflow", () => {
  const empty = {
    id: "w",
    name: "w",
    handle: "w",
    type: "manual",
    trigger: "manual",
    nodes: [],
    edges: [],
  } as unknown as Workflow;

  it("is fatal, so the pipeline never saves it", () => {
    const errors = enrichValidation(empty, []);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("EMPTY_WORKFLOW");
    expect(errors[0].severity).toBe("fatal");
  });

  it("carries an instruction the repair round can act on", () => {
    const [error] = enrichValidation(empty, []);

    expect(error.fix).toMatch(/at least one node/i);
  });

  it("reports nothing else, which would only be noise", () => {
    // Every other rule iterates nodes or edges and is vacuously satisfied here.
    const errors = enrichValidation(empty, [], [], {
      destination: {
        id: "send-email",
        kind: "email",
        label: "email it",
        nodeTypes: ["send-email"],
      },
    });

    expect(errors.map((e) => e.code)).toEqual(["EMPTY_WORKFLOW"]);
  });

  /**
   * The same failure one node further along.
   *
   * `hydrate` injects the trigger whatever the draft says, so a draft naming no
   * nodes reaches validation as a one-node graph on every trigger that injects
   * one — past a `nodes.length === 0` guard, past every other rule, saved and
   * run and reported as a success. The benchmark caught it as a queue workflow
   * that validated clean at one node and zero edges.
   */
  const onlyTrigger = {
    ...empty,
    trigger: "queue_message",
    nodes: [
      {
        id: "trigger",
        name: "Receive Queue Message",
        type: "receive-queue-message",
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [{ name: "body", type: "string" }],
      },
    ],
  } as unknown as Workflow;

  it("is fatal when the model contributed nothing but the injected trigger", () => {
    const errors = enrichValidation(onlyTrigger, []);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("EMPTY_WORKFLOW");
    expect(errors[0].severity).toBe("fatal");
  });

  it("says which of the two it is, so the repair round knows what to add", () => {
    const [error] = enrichValidation(onlyTrigger, []);

    expect(error.message).toMatch(/only the injected trigger/i);
  });

  it("accepts an echo endpoint, which is legitimately only the injected pair", () => {
    // `http-echo` is a shipped template of exactly this shape. The stub above
    // and this differ in one thing — whether anything is wired — so that, not
    // the node count, is what the rule turns on.
    const echo = {
      ...empty,
      trigger: "http_request",
      nodes: [
        {
          id: "trigger",
          name: "HTTP Request",
          type: "http-request",
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [{ name: "body", type: "json" }],
        },
        {
          id: "responder",
          name: "HTTP Response",
          type: "http-response",
          position: { x: 0, y: 0 },
          inputs: [{ name: "body", type: "any" }],
          outputs: [],
        },
      ],
      edges: [
        {
          source: "trigger",
          sourceOutput: "body",
          target: "responder",
          targetInput: "body",
        },
      ],
    } as unknown as Workflow;

    expect(enrichValidation(echo, []).map((e) => e.code)).not.toContain(
      "EMPTY_WORKFLOW"
    );
  });

  it("still accepts a graph the model did contribute to", () => {
    const contributed = {
      ...onlyTrigger,
      nodes: [
        ...onlyTrigger.nodes,
        {
          id: "output",
          name: "Text Output",
          type: "output-text",
          position: { x: 0, y: 0 },
          inputs: [{ name: "value", type: "string" }],
          outputs: [],
        },
      ],
    } as unknown as Workflow;

    expect(enrichValidation(contributed, []).map((e) => e.code)).not.toContain(
      "EMPTY_WORKFLOW"
    );
  });
});
