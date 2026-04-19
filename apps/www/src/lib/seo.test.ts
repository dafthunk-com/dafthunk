import { describe, expect, it } from "vitest";
import alternativesData from "../../data/alternatives.json";
import categoriesData from "../../data/categories.json";
import nodeMetaDescriptions from "../../data/node-meta-descriptions.json";
import nodesData from "../../data/nodes.json";
import workflowsData from "../../data/workflows.json";
import { META_DESCRIPTION_MAX, META_DESCRIPTION_MIN } from "./seo";

interface CategoryLike {
  id: string;
  metaDescription?: string;
}

interface WorkflowLike {
  id: string;
  metaDescription?: string;
}

interface AlternativeLike {
  id: string;
  metaDescription?: string;
  published: boolean;
}

interface NodeLike {
  description?: string;
}

const categories = (categoriesData as { categories: CategoryLike[] })
  .categories;
const workflows = (workflowsData as { workflows: WorkflowLike[] }).workflows;
const alternatives = (
  alternativesData as { alternatives: AlternativeLike[] }
).alternatives.filter((a) => a.published);
const nodes = nodesData as Record<string, NodeLike>;
const nodeOverrides = nodeMetaDescriptions as Record<string, string>;

function inRange(s: string): boolean {
  return s.length >= META_DESCRIPTION_MIN && s.length <= META_DESCRIPTION_MAX;
}

describe("metaDescription bounds on authored entities", () => {
  it.each(
    categories.map((c) => [c.id, c] as const)
  )("categories/%s has a metaDescription in [110, 160]", (_id, category) => {
    expect(category.metaDescription).toBeDefined();
    expect(inRange(category.metaDescription as string)).toBe(true);
  });

  it.each(
    workflows.map((w) => [w.id, w] as const)
  )("workflows/%s has a metaDescription in [110, 160]", (_id, workflow) => {
    expect(workflow.metaDescription).toBeDefined();
    expect(inRange(workflow.metaDescription as string)).toBe(true);
  });

  it.each(
    alternatives.map((a) => [a.id, a] as const)
  )("alternatives/%s has a metaDescription in [110, 160]", (_id, alt) => {
    expect(alt.metaDescription).toBeDefined();
    expect(inRange(alt.metaDescription as string)).toBe(true);
  });
});

describe("node descriptions fit SERP bounds", () => {
  it("every node override is in [110, 160]", () => {
    const failures: string[] = [];
    for (const [id, text] of Object.entries(nodeOverrides)) {
      if (!inRange(text)) {
        failures.push(`${id} (len=${text.length})`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("every node has a description at most 160 chars (override or raw)", () => {
    const failures: string[] = [];
    for (const [id, node] of Object.entries(nodes)) {
      const text = nodeOverrides[id] ?? node.description ?? "";
      if (text.length > META_DESCRIPTION_MAX) {
        failures.push(`${id} (len=${text.length})`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("every node has a non-empty description (override or raw)", () => {
    const failures: string[] = [];
    for (const [id, node] of Object.entries(nodes)) {
      const text = nodeOverrides[id] ?? node.description ?? "";
      if (text.length === 0) failures.push(id);
    }
    expect(failures).toEqual([]);
  });

  it("node overrides reference real node IDs", () => {
    const unknown = Object.keys(nodeOverrides).filter((id) => !nodes[id]);
    expect(unknown).toEqual([]);
  });
});

describe("no cross-page description duplication", () => {
  it("authored metaDescriptions are unique across categories, workflows, and alternatives", () => {
    const all: { label: string; text: string }[] = [
      ...categories.map((c) => ({
        label: `categories/${c.id}`,
        text: c.metaDescription ?? "",
      })),
      ...workflows.map((w) => ({
        label: `workflows/${w.id}`,
        text: w.metaDescription ?? "",
      })),
      ...alternatives.map((a) => ({
        label: `alternatives/${a.id}`,
        text: a.metaDescription ?? "",
      })),
    ];

    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const entry of all) {
      const existing = seen.get(entry.text);
      if (existing) {
        duplicates.push(`${entry.label} duplicates ${existing}`);
      } else {
        seen.set(entry.text, entry.label);
      }
    }

    expect(duplicates).toEqual([]);
  });
});
