import type { Node, NodeType } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  agentToolCatalog,
  applyAgentTools,
  isAgentNodeType,
  normalizeToolReferences,
  TOOL_EQUIPPED_MAX_STEPS,
  usableAsTool,
} from "./agent-tools";

function nodeType(overrides: Partial<NodeType> & { type: string }): NodeType {
  return {
    id: overrides.type,
    name: overrides.type,
    description: "",
    tags: [],
    icon: "box",
    inputs: [],
    outputs: [],
    ...overrides,
  } as NodeType;
}

/** The shape `base-agent-node.ts` builds, reduced to what matters here. */
function agentNode(inputs: Record<string, unknown> = {}): Node {
  return {
    id: "agent",
    name: "Agent",
    type: "agent-claude-sonnet-4",
    position: { x: 0, y: 0 },
    inputs: [
      { name: "input", type: "string", required: true },
      {
        name: "max_steps",
        type: "number",
        hidden: true,
        value: "max_steps" in inputs ? inputs.max_steps : 10,
      },
      {
        name: "tools",
        type: "json",
        hidden: true,
        value: "tools" in inputs ? inputs.tools : [],
      },
    ],
    outputs: [{ name: "text", type: "any" }],
  } as unknown as Node;
}

describe("isAgentNodeType", () => {
  it("recognizes a node that loops over tool calls", () => {
    const agent = nodeType({
      type: "agent-claude-sonnet-4",
      inputs: [
        { name: "tools", type: "json", hidden: true },
        { name: "max_steps", type: "number", hidden: true },
      ],
    });

    expect(isAgentNodeType(agent)).toBe(true);
  });

  it("does not recognize a model node that merely accepts tools", () => {
    // The Gemini nodes carry `tools` for single-round function calling. Offering
    // them the agent treatment would advertise a loop that is not there.
    const model = nodeType({
      type: "gemini-3-flash",
      inputs: [{ name: "tools", type: "json", hidden: true }],
    });

    expect(isAgentNodeType(model)).toBe(false);
  });
});

describe("usableAsTool", () => {
  const fetchLike = nodeType({
    type: "fetch",
    asTool: true,
    inputs: [
      { name: "url", type: "string", required: true },
      { name: "method", type: "string", value: "GET" },
    ],
  });

  it("accepts a node an agent can call with JSON arguments", () => {
    expect(usableAsTool(fetchLike)).toBe(true);
  });

  it("refuses a node requiring a blob", () => {
    // `to-markdown` takes a document, and a model writes its arguments as JSON.
    const toMarkdown = nodeType({
      type: "to-markdown",
      asTool: true,
      inputs: [{ name: "document", type: "document", required: true }],
    });

    expect(usableAsTool(toMarkdown)).toBe(false);
  });

  it("refuses a node whose credentials cannot be supplied", () => {
    const gmail = nodeType({
      type: "send-email-google-mail",
      asTool: true,
      inputs: [
        {
          name: "auth",
          type: "integration",
          provider: "google-mail",
          required: true,
        },
        { name: "subject", type: "string", required: true },
      ],
    });

    expect(usableAsTool(gmail)).toBe(false);
  });

  it("refuses a hidden required input with no default", () => {
    // The tool schema skips hidden inputs, so this is a tool that always fails.
    const broken = nodeType({
      type: "broken",
      asTool: true,
      inputs: [{ name: "key", type: "string", required: true, hidden: true }],
    });

    expect(usableAsTool(broken)).toBe(false);
  });

  it("refuses anything not declared as a tool", () => {
    expect(usableAsTool(nodeType({ type: "output-text" }))).toBe(false);
  });
});

describe("agentToolCatalog", () => {
  it("keeps only allowlisted types this deployment registered", () => {
    const catalog = agentToolCatalog([
      nodeType({
        type: "fetch",
        asTool: true,
        inputs: [{ name: "url", type: "string", required: true }],
      }),
      nodeType({
        type: "send-email",
        asTool: true,
        inputs: [{ name: "to", type: "string", required: true }],
      }),
    ]);

    expect(catalog.map((tool) => tool.type)).toEqual(["fetch"]);
  });

  it("returns nothing when the allowlisted types are not registered", () => {
    expect(agentToolCatalog([nodeType({ type: "output-text" })])).toEqual([]);
  });
});

describe("normalizeToolReferences", () => {
  it("reads the documented shape", () => {
    const { references } = normalizeToolReferences([
      { type: "node", identifier: "fetch" },
    ]);

    expect(references).toEqual([{ type: "node", identifier: "fetch" }]);
  });

  it("reads a bare type name", () => {
    const { references } = normalizeToolReferences(["fetch"]);
    expect(references).toEqual([{ type: "node", identifier: "fetch" }]);
  });

  it("reads the prefixed name the agent sees at run time", () => {
    const { references } = normalizeToolReferences(["node_fetch"]);
    expect(references).toEqual([{ type: "node", identifier: "fetch" }]);
  });

  it("reads a JSON string, which is what a json input often arrives as", () => {
    const { references } = normalizeToolReferences(
      '[{"type":"node","identifier":"calculator"}]'
    );

    expect(references).toEqual([{ type: "node", identifier: "calculator" }]);
  });

  it("reports entries it cannot read rather than dropping them", () => {
    const { references, unreadable } = normalizeToolReferences([
      { name: "fetch" },
      42,
    ]);

    expect(references).toEqual([]);
    expect(unreadable).toEqual(['{"name":"fetch"}', "42"]);
  });

  it("treats a non-array as no tools at all", () => {
    expect(normalizeToolReferences(undefined).references).toEqual([]);
    expect(normalizeToolReferences("not json").references).toEqual([]);
  });
});

describe("applyAgentTools", () => {
  const allowed = new Set(["fetch", "calculator"]);

  it("keeps allowlisted tools and reports the rest", () => {
    const node = agentNode({
      tools: [
        { type: "node", identifier: "fetch" },
        { type: "node", identifier: "send-email" },
      ],
    });

    const { kept, rejected } = applyAgentTools(node, allowed);

    expect(kept).toEqual([{ type: "node", identifier: "fetch" }]);
    expect(rejected).toEqual(["send-email"]);
    expect(node.inputs.find((input) => input.name === "tools")?.value).toEqual([
      { type: "node", identifier: "fetch" },
    ]);
  });

  it("deduplicates", () => {
    const node = agentNode({ tools: ["fetch", "fetch"] });
    expect(applyAgentTools(node, allowed).kept).toHaveLength(1);
  });

  it("raises the step ceiling once the agent has tools", () => {
    const node = agentNode({ tools: ["fetch"] });
    applyAgentTools(node, allowed);

    expect(node.inputs.find((input) => input.name === "max_steps")?.value).toBe(
      TOOL_EQUIPPED_MAX_STEPS
    );
  });

  it("leaves a ceiling the model chose alone", () => {
    const node = agentNode({ tools: ["fetch"], max_steps: 4 });
    applyAgentTools(node, allowed);

    expect(node.inputs.find((input) => input.name === "max_steps")?.value).toBe(
      4
    );
  });

  it("leaves the ceiling alone when nothing survived", () => {
    const node = agentNode({ tools: ["send-email"] });
    const { kept, rejected } = applyAgentTools(node, allowed);

    expect(kept).toEqual([]);
    expect(rejected).toEqual(["send-email"]);
    expect(node.inputs.find((input) => input.name === "max_steps")?.value).toBe(
      10
    );
  });

  it("does nothing to a node with no tools input", () => {
    const plain = {
      id: "text",
      type: "output-text",
      inputs: [{ name: "value", type: "string" }],
      outputs: [],
    } as unknown as Node;

    expect(applyAgentTools(plain, allowed)).toEqual({ kept: [], rejected: [] });
  });
});
