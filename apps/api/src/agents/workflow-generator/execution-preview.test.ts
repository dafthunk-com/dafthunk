import type { Workflow, WorkflowExecution } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { MAX_PREVIEW_VALUE_CHARS, previewExecution } from "./execution-preview";

function executionWith(
  outputs: Record<string, unknown>,
  extra: Partial<WorkflowExecution> = {}
): WorkflowExecution {
  return {
    id: "exec-1",
    workflowId: "wf-1",
    status: "completed",
    nodeExecutions: [
      {
        nodeId: "n1",
        status: "completed",
        usage: 0,
        inputs: { page: "x".repeat(50_000) },
        outputs,
      },
    ],
    ...extra,
  } as unknown as WorkflowExecution;
}

describe("previewExecution", () => {
  it("keeps a normal answer exactly as it is", () => {
    const summary = "A short summary of the page.";
    const preview = previewExecution(executionWith({ summary }));

    expect(preview.nodeExecutions[0].outputs?.summary).toBe(summary);
  });

  it("drops the inputs nothing renders", () => {
    // The single largest saving: a scraped page appears once as the scraper's
    // output and again as the summariser's input.
    const preview = previewExecution(executionWith({ summary: "hi" }));

    expect(preview.nodeExecutions[0].inputs).toBeUndefined();
  });

  it("drops the workflow snapshot, which was already sent as its own frame", () => {
    const preview = previewExecution(
      executionWith(
        { summary: "hi" },
        {
          workflowDefinition: {
            id: "wf-1",
            nodes: [],
            edges: [],
          } as unknown as Workflow,
        }
      )
    );

    expect(preview.workflowDefinition).toBeUndefined();
  });

  it("cuts a long string and says that it did", () => {
    const preview = previewExecution(
      executionWith({ markdown: "y".repeat(60_000) })
    );

    const value = preview.nodeExecutions[0].outputs?.markdown as string;
    expect(value.length).toBeLessThan(MAX_PREVIEW_VALUE_CHARS + 200);
    expect(value).toContain("truncated");
  });

  it("replaces an oversized object rather than half-serialising it", () => {
    const rows = Array.from({ length: 5000 }, (_, index) => ({
      id: index,
      name: `row ${index}`,
    }));

    const value = previewExecution(executionWith({ rows })).nodeExecutions[0]
      .outputs?.rows;

    // Half a JSON document is worse than a sentence saying how big it was.
    expect(typeof value).toBe("string");
    expect(value).toContain("characters of data");
  });

  it("leaves a small object as an object", () => {
    const rows = [{ id: 1 }];
    const value = previewExecution(executionWith({ rows })).nodeExecutions[0]
      .outputs?.rows;

    expect(value).toEqual(rows);
  });

  it("brings a runaway execution back under the row limit", () => {
    // The shape that actually failed: several nodes each carrying a scraped
    // page, inline, plus the same text again as the next node's input.
    const huge = executionWith({ markdown: "z".repeat(400_000) });
    huge.nodeExecutions = Array.from({ length: 10 }, (_, index) => ({
      ...huge.nodeExecutions[0],
      nodeId: `n${index}`,
    }));

    const before = JSON.stringify(huge).length;
    const after = JSON.stringify(previewExecution(huge)).length;

    expect(before).toBeGreaterThan(2_000_000);
    expect(after).toBeLessThan(200_000);
  });

  it("keeps the fields the outcome screen and repair loop rely on", () => {
    const failed = executionWith(
      { summary: "hi" },
      { status: "error", error: "boom" }
    );
    failed.nodeExecutions[0].status = "error";
    failed.nodeExecutions[0].error = "node blew up";

    const preview = previewExecution(failed);

    expect(preview.status).toBe("error");
    expect(preview.error).toBe("boom");
    expect(preview.nodeExecutions[0].nodeId).toBe("n1");
    expect(preview.nodeExecutions[0].status).toBe("error");
    expect(preview.nodeExecutions[0].error).toBe("node blew up");
  });

  it("carries the rehearsal stamp through the trim", () => {
    const preview = previewExecution(
      executionWith({ summary: "hi" }, { rehearsal: true })
    );

    expect(preview.rehearsal).toBe(true);
  });
});
