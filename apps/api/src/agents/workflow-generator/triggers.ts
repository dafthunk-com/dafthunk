import type { WorkflowTrigger } from "@dafthunk/types";
import { TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";

/**
 * Reading a model's word for "what starts this" as a real trigger.
 *
 * Its own module because three unrelated stages need it — the brief names a
 * trigger before any graph exists, the pipeline reports one on the plan frame,
 * hydration builds the node from it — and only one of those is hydration. The
 * other two used to import `hydrate.ts` for this single function, which put a
 * graph builder underneath a sentence writer.
 */

// Derived rather than restated: TRIGGER_TO_NODE_TYPES is typed
// Record<WorkflowTrigger, …>, so it fails to compile when a trigger is added.
// A hand-maintained copy here would silently go stale instead.
export const VALID_TRIGGERS: ReadonlySet<string> = new Set(
  Object.keys(TRIGGER_TO_NODE_TYPES)
);

/**
 * Common near-misses. `POST /workflows` types `trigger` as a bare string, so an
 * unrecognized value would be stored and produce a workflow the UI cannot
 * classify — normalizing here is the only thing standing in the way.
 */
const TRIGGER_ALIASES: Record<string, WorkflowTrigger> = {
  webhook: "http_webhook",
  http: "http_request",
  https: "http_request",
  request: "http_request",
  api: "http_request",
  cron: "scheduled",
  schedule: "scheduled",
  timer: "scheduled",
  email: "email_message",
  mail: "email_message",
  form: "form_request",
  queue: "queue_message",
  discord: "discord_event",
  telegram: "telegram_event",
  whatsapp: "whatsapp_event",
  slack: "slack_event",
  none: "manual",
};

export function normalizeTrigger(raw: string): WorkflowTrigger | undefined {
  const value = raw
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (VALID_TRIGGERS.has(value)) return value as WorkflowTrigger;
  // No alias key contains an underscore, so stripping them is the only lookup
  // that can ever match.
  return TRIGGER_ALIASES[value.replace(/_/g, "")];
}
