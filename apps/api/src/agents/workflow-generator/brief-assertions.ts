import type { Brief } from "@dafthunk/types";
import { resolveDestination, resolveTrigger } from "@dafthunk/utils";

import type { BriefBenchmarkCase } from "./brief-benchmark-cases";

/**
 * What a brief failed to deliver against a case, in words worth reading.
 *
 * Pure over the brief, so the same checks serve the unit suite (against
 * normalizer fixtures) and the integration benchmark (against real model
 * calls). Empty means the case is met.
 */
export function briefViolations(
  brief: Brief,
  expectations: BriefBenchmarkCase
): string[] {
  const violations: string[] = [];

  if (expectations.expectTrigger) {
    const resolved = resolveTrigger(brief);
    if (resolved !== expectations.expectTrigger) {
      violations.push(
        `trigger resolves to "${resolved}", expected "${expectations.expectTrigger}"`
      );
    }
  }

  for (const role of expectations.expectRoles ?? []) {
    if (!brief.blanks.some((blank) => blank.role === role)) {
      violations.push(`no blank with role "${role}"`);
    }
  }

  if (expectations.expectDestinationId) {
    const destination = resolveDestination(brief);
    if (destination.id !== expectations.expectDestinationId) {
      violations.push(
        `destination resolves to "${destination.id}", expected "${expectations.expectDestinationId}"`
      );
    }
  }

  if (expectations.expectGrounded) {
    const { family, instanceIds, allowCreate } = expectations.expectGrounded;
    const grounded = brief.blanks.find(
      (blank) => blank.type === "choice" && blank.grounding?.family === family
    );
    if (!grounded || grounded.type !== "choice") {
      violations.push(`no grounded "${family}" blank`);
    } else {
      const offered = new Set(
        grounded.options
          .map((option) => option.resourceId)
          .filter((id): id is string => Boolean(id))
      );
      for (const id of instanceIds ?? []) {
        if (!offered.has(id)) {
          violations.push(`grounded "${family}" blank does not offer ${id}`);
        }
      }
      if (allowCreate && !grounded.options.some((option) => option.createNew)) {
        violations.push(
          `grounded "${family}" blank offers no create-new option`
        );
      }
    }
  }

  return violations;
}
