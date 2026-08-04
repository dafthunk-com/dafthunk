import type { Node, Parameter, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { MAX_EXAMPLE_VALUE_CHARS, MAX_GENERATED_EXAMPLES } from "./config";
import type { DraftExample, GeneratedWorkflowDraft } from "./draft-types";
import { buildGeneratedExamples } from "./examples";

type Graph = Pick<Workflow, "nodes" | "edges">;

function param(name: string, type: string, extra: Partial<Parameter> = {}) {
  return { name, type, ...extra } as Parameter;
}

function node(id: string, type: string, inputs: Parameter[]): Node {
  return { id, name: id, type, position: { x: 0, y: 0 }, inputs, outputs: [] };
}

/**
 * An article feeding a summarizer that also holds a secret and an edge-fed
 * input — one node covering every case the sanitizer has to decide.
 */
function graph(): Graph {
  return {
    nodes: [
      node("article", "text-input", [
        param("value", "string", { value: "The graph's own text." }),
      ]),
      node("summarize", "ai-text", [
        param("prompt", "string", { value: "Summarize this." }),
        param("input", "string"),
        param("apiKey", "secret", { value: "OPENAI_KEY" }),
      ]),
    ],
    edges: [
      {
        source: "article",
        sourceOutput: "value",
        target: "summarize",
        targetInput: "input",
      },
    ],
  };
}

function draft(
  examples?: DraftExample[],
  sampleTrigger?: Record<string, unknown>
): GeneratedWorkflowDraft {
  return {
    title: "Summarize",
    description: "Summarizes an article",
    trigger: "manual",
    steps: [],
    nodes: [],
    edges: [],
    examples,
    sampleTrigger,
  };
}

describe("buildGeneratedExamples", () => {
  it("completes an example from the graph's own literals", () => {
    const [example] = buildGeneratedExamples(
      draft([
        { name: "Short article", nodeValues: { article: { value: "Rain." } } },
      ]),
      graph()
    );

    expect(example.nodeValues).toEqual({
      // The model's value wins over the graph's...
      article: { value: "Rain." },
      // ...and everything it did not mention is still there.
      summarize: { prompt: "Summarize this." },
    });
    expect(example.name).toBe("Short article");
    expect(example.isDefault).toBe(true);
  });

  it("drops values that name nothing on this graph", () => {
    const [example] = buildGeneratedExamples(
      draft([
        {
          name: "Bad",
          nodeValues: {
            ghost: { value: "no such node" },
            article: { nonesuch: "no such input" },
          },
        },
      ]),
      graph()
    );

    expect(example.nodeValues.ghost).toBeUndefined();
    expect(example.nodeValues.article).toEqual({
      value: "The graph's own text.",
    });
  });

  it("drops a value for an input an edge already feeds", () => {
    const [example] = buildGeneratedExamples(
      draft([
        { name: "Edged", nodeValues: { summarize: { input: "ignored" } } },
      ]),
      graph()
    );

    // An edge always beats a literal at execution time, so storing this would
    // have been silently ineffective.
    expect(example.nodeValues.summarize).toEqual({ prompt: "Summarize this." });
  });

  it("drops credential-typed values", () => {
    const [example] = buildGeneratedExamples(
      draft([
        { name: "Leaky", nodeValues: { summarize: { apiKey: "sk-live" } } },
      ]),
      graph()
    );

    expect(example.nodeValues.summarize.apiKey).toBeUndefined();
  });

  it("drops values the executor would ignore", () => {
    const [example] = buildGeneratedExamples(
      draft([
        {
          name: "Junk",
          nodeValues: { article: { value: null as unknown as string } },
        },
      ]),
      graph()
    );

    expect(example.nodeValues.article).toEqual({
      value: "The graph's own text.",
    });
  });

  it("drops an invented object reference", () => {
    const [example] = buildGeneratedExamples(
      draft([
        {
          name: "Phantom file",
          nodeValues: {
            article: { value: { id: "obj-1", mimeType: "image/png" } },
          },
        },
      ]),
      graph()
    );

    // The model cannot know the id of an object that exists, so a reference it
    // writes points at nothing.
    expect(example.nodeValues.article).toEqual({
      value: "The graph's own text.",
    });
  });

  it("truncates an oversized string and drops an oversized object", () => {
    const [example] = buildGeneratedExamples(
      draft([
        {
          name: "Huge",
          nodeValues: {
            article: { value: "x".repeat(MAX_EXAMPLE_VALUE_CHARS + 500) },
            summarize: {
              prompt: { padding: "y".repeat(MAX_EXAMPLE_VALUE_CHARS) },
            },
          },
        },
      ]),
      graph()
    );

    expect(example.nodeValues.article.value).toHaveLength(
      MAX_EXAMPLE_VALUE_CHARS
    );
    expect(example.nodeValues.summarize.prompt).toBe("Summarize this.");
  });

  it("keeps at most the cap, and only the first is the default", () => {
    const many = Array.from({ length: MAX_GENERATED_EXAMPLES + 2 }, (_, i) => ({
      name: `Case ${i}`,
    }));

    const examples = buildGeneratedExamples(draft(many), graph());

    expect(examples).toHaveLength(MAX_GENERATED_EXAMPLES);
    expect(examples.filter((example) => example.isDefault)).toHaveLength(1);
    expect(examples[0].isDefault).toBe(true);
  });

  it("keeps names distinct, since a name is how an example is picked", () => {
    const examples = buildGeneratedExamples(
      draft([{ name: "Same" }, { name: "Same" }, { name: "  " }]),
      graph()
    );

    expect(examples.map((example) => example.name)).toEqual([
      "Same",
      "Same 2",
      "Example 3",
    ]);
  });

  it("falls back to the graph's values when the model emitted none", () => {
    const examples = buildGeneratedExamples(
      draft(undefined, { from: "a@b.com" }),
      graph()
    );

    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({
      name: "Generated sample",
      isDefault: true,
      trigger: { from: "a@b.com" },
    });
    expect(examples[0].nodeValues).toEqual({
      article: { value: "The graph's own text." },
      summarize: { prompt: "Summarize this." },
    });
  });

  it("gives every example a trigger payload, its own or the draft's", () => {
    const examples = buildGeneratedExamples(
      draft(
        [
          { name: "Urgent", trigger: { subject: "URGENT" } },
          { name: "Ordinary" },
        ],
        { subject: "Hello" }
      ),
      graph()
    );

    expect(examples[0].trigger).toEqual({ subject: "URGENT" });
    expect(examples[1].trigger).toEqual({ subject: "Hello" });
  });
});
