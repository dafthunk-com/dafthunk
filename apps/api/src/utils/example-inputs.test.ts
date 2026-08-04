import { describe, expect, it } from "vitest";

import {
  buildInputOverrides,
  buildTriggerParameters,
  extractNodeValues,
  selectExample,
} from "./example-inputs";

function decode(data: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(data));
}

describe("buildTriggerParameters", () => {
  it("maps the email shape onto the executor's field names", () => {
    const parameters = buildTriggerParameters("email_message", {
      from: "user@example.com",
      subject: "Cannot log in",
      body: "Since the update I get a 500.",
    });

    expect(parameters).toMatchObject({
      from: "user@example.com",
      subject: "Cannot log in",
      emailBody: "Since the update I get a 500.",
    });
  });

  it("falls back to plausible email values when the model omits them", () => {
    const parameters = buildTriggerParameters("email_message", undefined);
    expect(parameters.from).toBeTruthy();
    expect(parameters.emailBody).toBeTruthy();
  });

  it("encodes an http body as a BlobParameter", () => {
    const parameters = buildTriggerParameters(
      "http_request",
      { method: "post", jsonBody: { name: "ada" }, query: { debug: true } },
      { apiHost: "https://api.example.com" }
    );

    expect(parameters.method).toBe("POST");
    expect(parameters.url).toBe("https://api.example.com");
    expect(parameters.query).toEqual({ debug: "true" });
    expect(parameters.body?.mimeType).toBe("application/json");
    expect(parameters.body?.data).toBeInstanceOf(Uint8Array);
    expect(decode(parameters.body!.data)).toEqual({ name: "ada" });
  });

  it("passes a form record through", () => {
    expect(
      buildTriggerParameters("form_request", { formRecord: { email: "a@b.c" } })
    ).toEqual({ formRecord: { email: "a@b.c" } });
  });

  it("sends nothing for triggers the executor has no payload for", () => {
    expect(buildTriggerParameters("manual", { anything: 1 })).toEqual({});
    expect(buildTriggerParameters("scheduled", undefined)).toEqual({});
  });
});

describe("buildInputOverrides", () => {
  const workflow = {
    trigger: "manual" as const,
    nodes: [
      {
        id: "text",
        name: "Text",
        type: "text-input",
        position: { x: 0, y: 0 },
        inputs: [{ name: "value", type: "string" as const }],
        outputs: [{ name: "value", type: "string" as const }],
      },
      {
        id: "out",
        name: "Out",
        type: "output-text",
        position: { x: 0, y: 0 },
        inputs: [{ name: "value", type: "string" as const }],
        outputs: [],
      },
    ],
    edges: [
      {
        source: "text",
        sourceOutput: "value",
        target: "out",
        targetInput: "value",
      },
    ],
  };

  function example(nodeValues: Record<string, Record<string, unknown>>) {
    return {
      id: "ex-1",
      name: "Example",
      isDefault: true,
      nodeValues,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it("applies a value to an unconnected input", () => {
    expect(
      buildInputOverrides(example({ text: { value: "hi" } }), workflow)
    ).toEqual({ text: { value: "hi" } });
  });

  it("skips an input fed by an edge, because the edge would win anyway", () => {
    expect(
      buildInputOverrides(example({ out: { value: "hi" } }), workflow)
    ).toEqual({});
  });

  it("skips a value whose node is gone", () => {
    expect(
      buildInputOverrides(example({ ghost: { value: "hi" } }), workflow)
    ).toEqual({});
  });

  it("skips a value whose input no longer exists", () => {
    expect(
      buildInputOverrides(example({ text: { gone: "hi" } }), workflow)
    ).toEqual({});
  });

  it("ignores the example's trigger payload", () => {
    expect(
      buildInputOverrides(
        {
          ...example({ text: { value: "hi" } }),
          trigger: { from: "a@b.c", subject: "Hi", body: "Body" },
        },
        workflow
      )
    ).toEqual({ text: { value: "hi" } });
  });
});

describe("selectExample", () => {
  const first = {
    id: "a",
    name: "A",
    isDefault: false,
    nodeValues: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const second = { ...first, id: "b", name: "B", isDefault: true };

  it("prefers an explicit id", () => {
    expect(selectExample([first, second], "a")?.id).toBe("a");
  });

  it("falls back to the default", () => {
    expect(selectExample([first, second])?.id).toBe("b");
  });

  it("returns nothing when an unknown id is asked for", () => {
    expect(selectExample([first, second], "zzz")).toBeUndefined();
  });

  it("returns nothing when there is no default", () => {
    expect(selectExample([first])).toBeUndefined();
  });
});

describe("extractNodeValues", () => {
  it("captures visible, unconnected literals", () => {
    const values = extractNodeValues({
      nodes: [
        {
          id: "text",
          name: "Text",
          type: "text-input",
          position: { x: 0, y: 0 },
          inputs: [{ name: "value", type: "string" as const, value: "hi" }],
          outputs: [],
        },
      ],
      edges: [],
    });

    expect(values).toEqual({ text: { value: "hi" } });
  });

  it("captures a hidden widget-backed value", () => {
    // `text-input` marks its value hidden because the widget renders it inline.
    // Skipping every hidden input would drop exactly the values worth capturing.
    const values = extractNodeValues({
      nodes: [
        {
          id: "text",
          name: "Text",
          type: "text-input",
          position: { x: 0, y: 0 },
          inputs: [
            {
              name: "value",
              type: "string" as const,
              value: "hi",
              hidden: true,
            },
          ],
          outputs: [],
        },
      ],
      edges: [],
    });

    expect(values).toEqual({ text: { value: "hi" } });
  });

  it("skips the pinned inputs of a locked node", () => {
    const values = extractNodeValues({
      nodes: [
        {
          id: "ai",
          name: "AI",
          type: "cloudflare-model",
          position: { x: 0, y: 0 },
          metadata: { _cf_locked: "true" },
          inputs: [
            {
              name: "model",
              type: "string" as const,
              value: "@cf/x",
              hidden: true,
            },
            { name: "prompt", type: "string" as const, value: "Hi" },
          ],
          outputs: [],
        },
      ],
      edges: [],
    });

    expect(values).toEqual({ ai: { prompt: "Hi" } });
  });

  it("skips credential and resource types", () => {
    const values = extractNodeValues({
      nodes: [
        {
          id: "send",
          name: "Send",
          type: "send-slack-message",
          position: { x: 0, y: 0 },
          inputs: [
            {
              name: "integrationId",
              type: "integration" as const,
              value: "i-1",
              provider: "slack",
            },
            { name: "text", type: "string" as const, value: "Hello" },
          ],
          outputs: [],
        },
      ],
      edges: [],
    });

    expect(values).toEqual({ send: { text: "Hello" } });
  });

  it("skips connected inputs, whose literal would be inert anyway", () => {
    const values = extractNodeValues({
      nodes: [
        {
          id: "a",
          name: "A",
          type: "text-input",
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [{ name: "value", type: "string" as const }],
        },
        {
          id: "b",
          name: "B",
          type: "output-text",
          position: { x: 0, y: 0 },
          inputs: [{ name: "value", type: "string" as const, value: "stale" }],
          outputs: [],
        },
      ],
      edges: [
        {
          source: "a",
          sourceOutput: "value",
          target: "b",
          targetInput: "value",
        },
      ],
    });

    expect(values).toEqual({});
  });
});
