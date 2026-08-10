import type { BriefResourceFamily, WorkflowTrigger } from "@dafthunk/types";

import type { BriefRole } from "./brief";

/**
 * Requests whose moving parts are known, so systematic identification can be
 * asserted instead of hoped for.
 *
 * The brief's whole point is that the schedule hour, the channel, the
 * criterion are *always* surfaced — the failure this suite gates is the one
 * the checklist prompt exists to prevent: the same moving part tappable on
 * one run and inert prose on the next, for no reason anyone could see.
 */
export interface BriefBenchmarkCase {
  id: string;
  prompt: string;
  /** What `resolveTrigger(brief)` must land on before anything is answered. */
  expectTrigger?: WorkflowTrigger;
  /** Roles that must exist as blanks — asked or quiet, either counts. */
  expectRoles?: BriefRole[];
  /** What `resolveDestination(brief)` must land on unanswered. */
  expectDestinationId?: string;
  /**
   * A grounded choice blank of this family must exist; when `instanceIds` is
   * given, each id must be among its options. `allowCreate` additionally
   * requires a create-new option.
   */
  expectGrounded?: {
    family: BriefResourceFamily;
    instanceIds?: string[];
    allowCreate?: boolean;
  };
}

export const BRIEF_BENCHMARK_CASES: BriefBenchmarkCase[] = [
  {
    id: "scheduled-triage",
    prompt:
      "Read my support inbox every morning and email me a list of what looks urgent",
    expectTrigger: "scheduled",
    // The hour of the schedule, the destination, and what "urgent" means are
    // exactly the three moving parts the original complaint was about.
    expectRoles: ["trigger", "destination", "criterion"],
    expectDestinationId: "email",
  },
  {
    id: "named-channel",
    prompt: "Summarize my latest blog post and post it to Discord",
    expectRoles: ["trigger", "destination"],
    expectDestinationId: "discord",
  },
  {
    id: "grounded-dataset",
    prompt: "Answer customer questions from my product documentation",
    expectRoles: ["trigger", "destination"],
    expectGrounded: { family: "dataset", instanceIds: ["ds-docs"] },
  },
  {
    id: "reuse-or-create-database",
    prompt: "Log every form submission into a database for me",
    expectRoles: ["trigger", "destination"],
    // The fixture owns one database, so there is a real choice to surface:
    // the existing one, or a new one. (With zero owned there is nothing to
    // choose between — no blank is the correct answer, and creation happens
    // at synthesis through the resource resolver.)
    expectGrounded: {
      family: "database",
      instanceIds: ["db-main"],
      allowCreate: true,
    },
  },
  {
    id: "plain-transform",
    prompt: "Translate a piece of text from English into German",
    expectTrigger: "manual",
    expectRoles: ["trigger", "destination"],
  },
];
