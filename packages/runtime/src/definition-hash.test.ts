import type { Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { computeDefinitionHash } from "./definition-hash";

function makeWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    id: "wf-1",
    name: "Test Workflow",
    handle: "test-workflow",
    trigger: "manual",
    nodes: [
      {
        id: "node-a",
        name: "Node A",
        type: "text-input",
        position: { x: 0, y: 0 },
        inputs: [{ name: "text", type: "string", value: "hello" }],
        outputs: [{ name: "text", type: "string" }],
      },
      {
        id: "node-b",
        name: "Node B",
        type: "text-output",
        position: { x: 200, y: 0 },
        inputs: [{ name: "text", type: "string" }],
        outputs: [],
      },
    ],
    edges: [
      {
        source: "node-a",
        target: "node-b",
        sourceOutput: "text",
        targetInput: "text",
      },
    ],
    ...overrides,
  };
}

describe("computeDefinitionHash", () => {
  it("produces a deterministic hash", async () => {
    const workflow = makeWorkflow();
    const hash1 = await computeDefinitionHash(workflow);
    const hash2 = await computeDefinitionHash(workflow);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{40}$/);
  });

  it("is stable under node reordering", async () => {
    const workflow1 = makeWorkflow();
    const workflow2 = makeWorkflow({
      nodes: [...workflow1.nodes].reverse(),
    });

    const hash1 = await computeDefinitionHash(workflow1);
    const hash2 = await computeDefinitionHash(workflow2);
    expect(hash1).toBe(hash2);
  });

  it("is stable under edge reordering", async () => {
    const workflow1 = makeWorkflow({
      edges: [
        {
          source: "node-a",
          target: "node-b",
          sourceOutput: "text",
          targetInput: "text",
        },
        {
          source: "node-b",
          target: "node-a",
          sourceOutput: "out",
          targetInput: "in",
        },
      ],
    });
    const workflow2 = makeWorkflow({
      edges: [...workflow1.edges].reverse(),
    });

    const hash1 = await computeDefinitionHash(workflow1);
    const hash2 = await computeDefinitionHash(workflow2);
    expect(hash1).toBe(hash2);
  });

  it("ignores non-semantic fields like position and name", async () => {
    const workflow1 = makeWorkflow();
    const workflow2 = makeWorkflow({
      nodes: workflow1.nodes.map((n) => ({
        ...n,
        position: { x: 999, y: 999 },
        name: "Renamed",
        description: "Some description",
        icon: "new-icon",
      })),
    });

    const hash1 = await computeDefinitionHash(workflow1);
    const hash2 = await computeDefinitionHash(workflow2);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different workflows", async () => {
    const workflow1 = makeWorkflow();
    const workflow2 = makeWorkflow({
      nodes: [
        {
          id: "node-a",
          name: "Node A",
          type: "text-input",
          position: { x: 0, y: 0 },
          inputs: [{ name: "text", type: "string", value: "world" }],
          outputs: [{ name: "text", type: "string" }],
        },
        ...workflow1.nodes.slice(1),
      ],
    });

    const hash1 = await computeDefinitionHash(workflow1);
    const hash2 = await computeDefinitionHash(workflow2);
    expect(hash1).not.toBe(hash2);
  });

  it("produces different hashes when trigger changes", async () => {
    const hash1 = await computeDefinitionHash(makeWorkflow());
    const hash2 = await computeDefinitionHash(
      makeWorkflow({ trigger: "http_webhook" })
    );
    expect(hash1).not.toBe(hash2);
  });

  it("ignores workflow-level metadata (id, name, handle)", async () => {
    const hash1 = await computeDefinitionHash(makeWorkflow());
    const hash2 = await computeDefinitionHash(
      makeWorkflow({ id: "wf-2", name: "Renamed", handle: "renamed" })
    );
    expect(hash1).toBe(hash2);
  });
});
