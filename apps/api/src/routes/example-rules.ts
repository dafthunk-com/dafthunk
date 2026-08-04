/**
 * Validation rules for the examples API.
 *
 * Kept out of the route wiring so they can be unit tested directly, the same way
 * `form-upload.ts` separates its upload rules.
 */

import type { WorkflowExample } from "@dafthunk/types";

import { MAX_FORM_FILE_BYTES, mimeMatchesFieldType } from "./form-upload";

/** Max examples per workflow — a UI list, not a bulk store. */
export const MAX_EXAMPLES_PER_WORKFLOW = 20;

export interface RuleFailure {
  message: string;
  status: 400 | 409;
}

/**
 * Whether a name is free. `exampleId` is the example being renamed, whose own
 * current name does not count as a clash.
 */
export function checkName(
  examples: WorkflowExample[],
  name: string | undefined,
  exampleId?: string
): RuleFailure | null {
  if (!name) return null;
  const clash = examples.some(
    (example) => example.name === name && example.id !== exampleId
  );
  return clash
    ? { message: "An example with that name already exists", status: 409 }
    : null;
}

/** Whether a new example may be added under the given name. */
export function checkNewExample(
  examples: WorkflowExample[],
  name: string
): RuleFailure | null {
  if (examples.length >= MAX_EXAMPLES_PER_WORKFLOW) {
    return {
      message: `A workflow can hold at most ${MAX_EXAMPLES_PER_WORKFLOW} examples`,
      status: 400,
    };
  }
  return checkName(examples, name);
}

/**
 * Whether an uploaded file may become a value for an input of this type.
 *
 * Deliberately stricter than `POST /objects`, which caps nothing and trusts the
 * client's declared MIME type outright.
 */
export function checkUpload(
  byteLength: number,
  mimeType: string,
  inputType: string
): RuleFailure | null {
  if (byteLength > MAX_FORM_FILE_BYTES) {
    return {
      message: `File exceeds the ${Math.floor(MAX_FORM_FILE_BYTES / 1024 / 1024)}MB limit`,
      status: 400,
    };
  }
  if (!mimeMatchesFieldType(mimeType, inputType)) {
    return {
      message: `${mimeType} is not valid for a ${inputType} input`,
      status: 400,
    };
  }
  return null;
}

/**
 * Exactly one example is the default.
 *
 * Applied on every write that sets one, so the invariant cannot drift as
 * examples are added and removed.
 */
export function applyDefaultExclusivity(
  examples: WorkflowExample[],
  defaultId: string
): WorkflowExample[] {
  return examples.map((example) => ({
    ...example,
    isDefault: example.id === defaultId,
  }));
}

/**
 * Keeps a default present after a deletion.
 *
 * Without this, deleting the default leaves a workflow with examples but nothing
 * for Run to pick, which reads as "examples stopped working".
 */
export function ensureDefault(examples: WorkflowExample[]): WorkflowExample[] {
  if (examples.length === 0) return examples;
  if (examples.some((example) => example.isDefault)) return examples;
  return applyDefaultExclusivity(examples, examples[0].id);
}
