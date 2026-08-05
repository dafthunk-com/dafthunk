import type { ParameterValue, WorkflowExecution } from "@dafthunk/types";

/**
 * Shrinks an execution to what a `run_result` frame actually needs.
 *
 * Every frame is written to the Durable Object's SQLite log so a reconnecting
 * client can be caught up. A full execution is not bounded by anything: a
 * scraped page arrives as an inline string, that same string is echoed in the
 * downstream node's `inputs`, and the whole workflow is attached again as
 * `workflowDefinition`. Past a couple of megabytes SQLite refuses the row with
 * SQLITE_TOOBIG, the insert throws, and a generation that had already produced
 * a working workflow dies at the last step.
 *
 * Three reductions, in order of how much they save:
 *
 * - `inputs` go entirely. Nothing renders them, and they are mostly a second
 *   copy of the previous node's output.
 * - `workflowDefinition` goes. The graph was already sent as its own frame.
 * - Long output values are cut, with a marker. The outcome screen renders
 *   these as prose, so a value past a few thousand characters is unreadable
 *   there whether or not it fits in a row.
 */

/**
 * Longest output value kept whole.
 *
 * Well under any row limit even with a large graph, and far past a real
 * answer: a summary that a person reads runs to hundreds of characters, not
 * thousands. Generous on purpose — this is a safety net, not a display budget.
 */
export const MAX_PREVIEW_VALUE_CHARS = 10_000;

const TRUNCATION_NOTE = "\n\n[…truncated. Open the workflow to see it all.]";

/** Cuts one output value down, or returns it untouched. */
function trimValue(value: ParameterValue): ParameterValue {
  if (typeof value === "string") {
    if (value.length <= MAX_PREVIEW_VALUE_CHARS) return value;
    return value.slice(0, MAX_PREVIEW_VALUE_CHARS) + TRUNCATION_NOTE;
  }

  // Objects and arrays are the other unbounded shape — a scraped table, a long
  // JSON array. Measured by their serialized size, since that is what is
  // actually stored, and replaced wholesale rather than partially: half a JSON
  // document is not something a caller can do anything with.
  if (value !== null && typeof value === "object") {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      return value;
    }
    if (serialized.length <= MAX_PREVIEW_VALUE_CHARS) return value;
    return `[${serialized.length.toLocaleString()} characters of data. Open the workflow to see it all.]`;
  }

  return value;
}

function trimOutputs(
  outputs: Record<string, ParameterValue> | null | undefined
): Record<string, ParameterValue> | undefined {
  if (!outputs) return undefined;
  const trimmed: Record<string, ParameterValue> = {};
  for (const [name, value] of Object.entries(outputs)) {
    trimmed[name] = trimValue(value);
  }
  return trimmed;
}

/** A copy of the execution that is safe to put in a frame. */
export function previewExecution(
  execution: WorkflowExecution
): WorkflowExecution {
  const { workflowDefinition: _dropped, ...rest } = execution;

  return {
    ...rest,
    nodeExecutions: execution.nodeExecutions.map((node) => {
      const { inputs: _inputs, ...node_ } = node;
      const outputs = trimOutputs(node.outputs);
      return outputs ? { ...node_, outputs } : node_;
    }),
  };
}
