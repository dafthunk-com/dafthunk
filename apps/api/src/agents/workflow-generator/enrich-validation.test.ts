import type { Workflow } from "@dafthunk/types";
import { buildNodeFromNodeType } from "@dafthunk/utils";
import { describe, expect, it } from "vitest";

import { enrichValidation, formatErrorsForLLM } from "./enrich-validation";
import {
  FIXTURE_NODE_TYPES,
  JSON_INPUT,
  OUTPUT_TEXT,
  TEXT_INPUT,
} from "./fixtures";

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
