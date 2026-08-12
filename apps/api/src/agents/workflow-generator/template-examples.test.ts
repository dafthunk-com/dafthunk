import { AgentClaudeOpus5Node } from "@dafthunk/runtime/nodes/agent/agent-claude-opus-5-node";
import { describe, expect, it } from "vitest";

import { workflowTemplates } from "../../templates";
import {
  isProjectable,
  selectExamples,
  templateToEmitFormat,
} from "./template-examples";

/**
 * The examples are load-bearing in a way prose is not: when they disagree with
 * the schema, the model follows them. So a projection that renames a node's
 * type but leaves its ports alone teaches wiring that cannot validate, and it
 * teaches it more convincingly than the schema corrects it.
 *
 * These assert the rename is complete — type, literal inputs and both ends of
 * every edge — across the real shipped templates rather than a fixture, because
 * the failure being guarded against is a template nobody remembered to update.
 */

const AGENT_TYPE = "agent-claude-opus-5";

/** Ports that belong to the Workers AI node and must not survive projection. */
const MODEL_PORTS = { input: "prompt", output: "response" };

describe("templateToEmitFormat", () => {
  it("projects pinned text models onto the agent node", () => {
    const template = workflowTemplates.find(
      (t) => t.id === "text-summarization"
    );
    expect(template).toBeDefined();

    const draft = templateToEmitFormat(template!);
    const types = draft.nodes.map((node) => node.type);

    expect(types).toContain(AGENT_TYPE);
    expect(types).not.toContain("ai-text");
    expect(types).not.toContain("cloudflare-model");
  });

  it("leaves no template teaching a port the agent node lacks", () => {
    for (const template of workflowTemplates) {
      const draft = templateToEmitFormat(template);
      const agents = new Set(
        draft.nodes.filter((n) => n.type === AGENT_TYPE).map((n) => n.id)
      );
      if (agents.size === 0) continue;

      for (const node of draft.nodes) {
        if (!agents.has(node.id) || !node.inputs) continue;
        expect(
          Object.keys(node.inputs),
          `${template.id}/${node.id} literal inputs`
        ).not.toContain(MODEL_PORTS.input);
      }

      for (const edge of draft.edges) {
        if (agents.has(edge.target)) {
          expect(edge.targetInput, `${template.id} edge into ${edge.target}`) //
            .not.toBe(MODEL_PORTS.input);
        }
        if (agents.has(edge.source)) {
          expect(edge.sourceOutput, `${template.id} edge out of ${edge.source}`) //
            .not.toBe(MODEL_PORTS.output);
        }
      }
    }
  });

  it("leaves no raw Workers AI node in an example it will offer", () => {
    // Image and transcription keep their pseudo types, having no Anthropic
    // equivalent. Templates with no stand-in at all keep `cloudflare-model`,
    // which is exactly why they must not be selectable — asserted separately.
    const projected = workflowTemplates
      .filter(isProjectable)
      .flatMap((t) => templateToEmitFormat(t).nodes.map((n) => n.type));

    expect(projected).not.toContain("cloudflare-model");
    expect(projected).toContain("ai-image");
    expect(projected).toContain("ai-transcribe");
  });

  /**
   * The check that would have caught the translation template.
   *
   * Asserting against the two port names the rename happened to know about
   * proved nothing: `text-translation` pins an m2m100 whose ports are
   * `text`/`source_lang`/`target_lang`/`translated_text`, none of which are
   * `prompt` or `response`, so it sailed through a test written around those
   * two names and taught the generator a node that could not be built. Ports
   * are checked against the node's own definition here, so any shape the
   * projection has not thought about fails.
   */
  it("only wires ports the agent node actually declares", () => {
    const declared = {
      inputs: new Set(AgentClaudeOpus5Node.nodeType.inputs.map((p) => p.name)),
      outputs: new Set(
        AgentClaudeOpus5Node.nodeType.outputs.map((p) => p.name)
      ),
    };

    for (const template of workflowTemplates.filter(isProjectable)) {
      const draft = templateToEmitFormat(template);
      const agents = new Set(
        draft.nodes.filter((n) => n.type === AGENT_TYPE).map((n) => n.id)
      );

      for (const node of draft.nodes) {
        if (!agents.has(node.id)) continue;
        for (const name of Object.keys(node.inputs ?? {})) {
          expect(
            declared.inputs,
            `${template.id}/${node.id} literal`
          ).toContain(name);
        }
      }

      for (const edge of draft.edges) {
        if (agents.has(edge.target)) {
          expect(declared.inputs, `${template.id} -> ${edge.target}`).toContain(
            edge.targetInput
          );
        }
        if (agents.has(edge.source)) {
          expect(
            declared.outputs,
            `${template.id} <- ${edge.source}`
          ).toContain(edge.sourceOutput);
        }
      }
    }
  });

  it("never offers an example it cannot project", () => {
    for (const query of [
      "translate a sentence into french",
      "describe this image",
      "read it out loud",
      "how does this review feel",
      "something entirely unrelated",
    ]) {
      for (const template of selectExamples(query, 3)) {
        expect(isProjectable(template), `${query} -> ${template.id}`).toBe(
          true
        );
      }
    }
  });

  it("preserves the edge count", () => {
    for (const template of workflowTemplates) {
      const draft = templateToEmitFormat(template);
      expect(draft.edges, template.id).toHaveLength(template.edges.length);
    }
  });
});
