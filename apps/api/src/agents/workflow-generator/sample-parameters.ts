import type { WorkflowTrigger } from "@dafthunk/types";

import type { WorkflowExecutorParameters } from "../../services/workflow-executor";

/**
 * Builds the simulated trigger payload for the first run.
 *
 * Note this is *not* where the model's per-node sample values go — those are
 * literal `inputs` baked onto the nodes during hydration. `WorkflowExecutor`
 * takes a trigger-shaped object instead: the email fields, the HTTP request, or
 * a form record. A manual workflow ignores it entirely.
 *
 * Everything is coerced defensively rather than schema-enforced, because the
 * Anthropic path appends the JSON schema to the system prompt instead of
 * constraining decoding, so the shape is a strong suggestion and not a promise.
 */

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") result[key] = entry;
    else if (typeof entry === "number" || typeof entry === "boolean") {
      result[key] = String(entry);
    }
  }
  return result;
}

function encodeJsonBody(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value ?? {}));
}

export function buildSampleParameters(
  trigger: WorkflowTrigger,
  sample: Record<string, unknown> | undefined,
  options: { apiHost?: string } = {}
): WorkflowExecutorParameters {
  const value = sample ?? {};

  switch (trigger) {
    case "email_message":
      return {
        from: asString(value.from, "sender@example.com"),
        subject: asString(value.subject, "Sample message"),
        emailBody: asString(
          value.body ?? value.emailBody,
          "This is a sample email body used for the first test run."
        ),
        attachments: [],
      };

    case "http_request":
    case "http_webhook": {
      const body = value.jsonBody ?? value.body ?? {};
      return {
        url: options.apiHost ?? "https://example.com/",
        method: asString(value.method, "POST").toUpperCase(),
        headers: { "content-type": "application/json" },
        query: asRecord(value.query),
        body: {
          data: encodeJsonBody(body),
          mimeType: "application/json",
        },
      };
    }

    case "form_request":
    case "form_webhook": {
      const record = value.formRecord ?? value.form ?? value;
      return {
        formRecord:
          record && typeof record === "object"
            ? (record as Record<string, unknown>)
            : {},
      };
    }

    default:
      // manual, scheduled, queue_message and the bot triggers carry no payload
      // the executor understands; their nodes read from literal input values.
      return {};
  }
}
