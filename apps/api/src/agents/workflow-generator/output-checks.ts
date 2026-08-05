import type {
  NodeExecution,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";

/**
 * Whether a generated workflow produced something a person asked for.
 *
 * The existing benchmark asks whether a valid graph comes out. This asks the
 * question that outranks it: a workflow can validate, run to completion and
 * still email somebody the prompt that was supposed to produce their summary.
 * Nothing structural can see that — `string -> string` is a legal edge whether
 * the string is a summary or the instructions for writing one.
 *
 * Deliberately deterministic. Every check here is a property of the text that
 * can be decided without a model, so it is cheap enough to run on every case,
 * stable enough to gate a merge, and it says what is wrong rather than scoring
 * how wrong. Judging whether the content is *good* is a separate, costlier
 * layer; this one catches the failures that are not a matter of taste.
 */

export interface OutputProblem {
  code:
    | "EMPTY"
    | "PASSED_THROUGH"
    | "PROMPT_LEAKED"
    | "META_COMMENTARY"
    | "FABRICATED"
    | "RAW_JSON"
    | "TRUNCATED";
  message: string;
}

/**
 * Text a node was handed, in the order the graph would have delivered it.
 *
 * Deliberately reads `inputs` rather than `outputs`: what a person receives is
 * what arrived at the terminal node, and for `send-email` or `output-text` the
 * interesting value is on the way in.
 */
function inboundText(execution: NodeExecution): string[] {
  const values = Object.values(execution.inputs ?? {});
  return values.filter(
    (value): value is string => typeof value === "string" && value.trim() !== ""
  );
}

/** Everything a node produced, as text. */
function outboundText(execution: NodeExecution): string[] {
  const values = Object.values(execution.outputs ?? {});
  return values.filter(
    (value): value is string => typeof value === "string" && value.trim() !== ""
  );
}

/**
 * Node types that end a workflow by handing something to a person.
 *
 * The delivered value is the only one worth judging. An intermediate node
 * carrying a prompt around is doing its job; a terminal node carrying the same
 * prompt is the bug.
 */
const TERMINAL_TYPES =
  /^(output-|notify-me$|send-email|share-post|send-message)/;

/** What the workflow actually delivered, across every terminal node. */
export function deliveredText(
  workflow: Workflow,
  execution: WorkflowExecution
): string[] {
  const typeById = new Map(workflow.nodes.map((node) => [node.id, node.type]));

  return execution.nodeExecutions
    .filter((node) => TERMINAL_TYPES.test(typeById.get(node.nodeId) ?? ""))
    .flatMap(inboundText);
}

/**
 * Scaffolding that belongs in a prompt and never in a result.
 *
 * These are phrases a model is told, not phrases it produces for a reader.
 * Seeing one in delivered output means the template reached the recipient
 * instead of the answer.
 */
const PROMPT_MARKERS = [
  /\bhere is the json\b/i,
  /\bhere'?s the json\b/i,
  /^\s*note:\s*assume\b/im,
  /\bassume the (article|content|text) (content )?is not available\b/i,
  /\byou are a helpful\b/i,
  /\brespond only with\b/i,
  /\bdo not include any\b/i,
  /```json/i,
];

/**
 * A model talking about the task instead of doing it.
 *
 * Distinct from a leaked prompt: nothing was mis-wired, the model simply
 * narrated. Same effect on the reader, different fix, so it gets its own code.
 */
const META_MARKERS = [
  /\bthe final answer is\b/i,
  /^\s*\(?note:\s*the (original|revised|previous)\b/im,
  /\bthe (original|revised) (instruction|response|answer)\b/i,
  /\bas an ai (language )?model\b/i,
  /\bsince the original response already\b/i,
  /\bhere is the (corrected|revised|updated) (response|version|answer)\b/i,
  /\bto meet the .{0,30}requirement\b/i,
  // Training-data debris. `# noqa` is a Python linter directive and has no
  // business in a summary; seeing one means the model is completing code.
  /#\s*noqa\b/i,
];

/**
 * A model inventing content because it was given nothing to work with.
 *
 * The most dangerous output of the set, because it reads as authoritative.
 * A digest that says "given the empty list, I will assume the first five story
 * IDs are 1, 2, 3" and then describes those stories is not a degraded result —
 * it is a fabricated one, and a reader has no way to tell.
 */
const FABRICATION_MARKERS = [
  /\bgiven the empty (list|array|result|response)\b/i,
  /\bsince (the|no) (list|data|content|results?) (is|are|was|were) empty\b/i,
  /\bi will assume\b/i,
  /\bassuming the (first|following)\b/i,
  /^\s*title:\s*unknown\s*$/im,
  /\b(is|are) likely about\b/i,
];

/** Whether the whole payload is a JSON document rather than something to read. */
function looksLikeRawJson(text: string): boolean {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "");
  if (!/^[[{]/.test(trimmed)) return false;
  try {
    JSON.parse(trimmed.replace(/```\s*$/, ""));
    return true;
  } catch {
    // Unparseable but JSON-shaped is the worse case, not a lesser one: it is
    // usually a document that was cut off partway through.
    return /^\[\s*\{/.test(trimmed);
  }
}

/**
 * Whether the text stops mid-thought.
 *
 * A truncated answer is indistinguishable from a short one by length alone, so
 * this looks for the shape of an interrupted structure rather than a size.
 */
function looksTruncated(text: string): boolean {
  const trimmed = text.trimEnd();
  if (trimmed.length < 40) return false;

  // An unclosed JSON container, or a final line that ends mid-string.
  const opens = (trimmed.match(/[[{]/g) ?? []).length;
  const closes = (trimmed.match(/[\]}]/g) ?? []).length;
  if (opens > closes) return true;

  const quotes = (trimmed.match(/"/g) ?? []).length;
  if (quotes % 2 === 1) return true;

  // Prose cut mid-word. Structural balance says nothing here — the giveaway is
  // a long passage whose last word is a fragment ("...web development to
  // entreprene") with no terminal punctuation to end it.
  if (/[.!?:;)\]}"'`]$/.test(trimmed)) return false;
  const lastWord = trimmed.split(/\s+/).pop() ?? "";
  return lastWord.length >= 5 && /^[a-z]+$/.test(lastWord);
}

export interface OutputCheckContext {
  /** Whether the request asked for prose rather than data. */
  expectsProse: boolean;
}

/**
 * Every deterministic complaint about what a workflow delivered.
 *
 * Returns all of them rather than the first: a run that leaks its prompt *and*
 * truncates has two different things wrong with it, and reporting one at a time
 * turns one investigation into three.
 */
export function checkDelivered(
  workflow: Workflow,
  execution: WorkflowExecution,
  context: OutputCheckContext
): OutputProblem[] {
  const delivered = deliveredText(workflow, execution);
  const problems: OutputProblem[] = [];

  if (delivered.length === 0) {
    return [
      {
        code: "EMPTY",
        message:
          "Nothing reached a terminal node — the workflow delivered no text.",
      },
    ];
  }

  // Everything produced upstream, so a terminal value that merely echoes one of
  // them can be recognised. This is the pass-through test, and it is the one
  // that catches a prompt being wired straight to the recipient.
  const upstream = new Set(
    execution.nodeExecutions.flatMap(outboundText).map((text) => text.trim())
  );

  for (const text of delivered) {
    const trimmed = text.trim();

    for (const marker of PROMPT_MARKERS) {
      if (marker.test(trimmed)) {
        problems.push({
          code: "PROMPT_LEAKED",
          message: `Delivered text contains prompt scaffolding (${marker.source}).`,
        });
        break;
      }
    }

    for (const marker of META_MARKERS) {
      if (marker.test(trimmed)) {
        problems.push({
          code: "META_COMMENTARY",
          message: `Delivered text narrates the task instead of doing it (${marker.source}).`,
        });
        break;
      }
    }

    for (const marker of FABRICATION_MARKERS) {
      if (marker.test(trimmed)) {
        problems.push({
          code: "FABRICATED",
          message: `Delivered text invents content it was never given (${marker.source}).`,
        });
        break;
      }
    }

    if (context.expectsProse && looksLikeRawJson(trimmed)) {
      problems.push({
        code: "RAW_JSON",
        message:
          "The request asked for something to read and a JSON document was delivered.",
      });
    }

    if (looksTruncated(trimmed)) {
      problems.push({
        code: "TRUNCATED",
        message: "Delivered text stops mid-structure — it was cut off.",
      });
    }
  }

  /**
   * The delivered value is verbatim something an earlier node emitted.
   *
   * Checked across the whole set rather than per value, and only when the
   * echoed node is not the sole producer — a one-step workflow legitimately
   * delivers exactly what its only node made. What this catches is a
   * transformation that was supposed to happen and did not.
   */
  if (execution.nodeExecutions.length > 2) {
    const echoed = delivered.find((text) => upstream.has(text.trim()));
    const producedByTerminalFeeder =
      echoed !== undefined &&
      execution.nodeExecutions.some(
        (node) =>
          outboundText(node).some((out) => out.trim() === echoed.trim()) &&
          inboundText(node).some((input) => input.trim() === echoed.trim())
      );

    if (echoed && !producedByTerminalFeeder) {
      // Only a warning in spirit — a summarizer's output legitimately equals
      // the value the output node receives. The signal is a *prompt-shaped*
      // echo, which the marker checks above already flag, so this is reported
      // without a code of its own when nothing else fired.
      if (problems.length === 0 && looksLikeRawJson(echoed)) {
        problems.push({
          code: "PASSED_THROUGH",
          message:
            "The delivered value is an earlier node's output, unchanged — nothing transformed it.",
        });
      }
    }
  }

  return problems;
}
