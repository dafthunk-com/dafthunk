import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

function formatWithPattern(
  iso: string,
  pattern: string,
  locale?: string
): string | undefined {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  // Simple patterns: YYYY, MM, DD, hh, mm, ss
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const tokens: Record<string, string> = {
    YYYY: String(d.getUTCFullYear()),
    MM: pad(d.getUTCMonth() + 1),
    DD: pad(d.getUTCDate()),
    hh: pad(d.getUTCHours()),
    mm: pad(d.getUTCMinutes()),
    ss: pad(d.getUTCSeconds()),
  };
  let out = pattern;
  for (const [k, v] of Object.entries(tokens)) out = out.replaceAll(k, v);
  if (out === pattern && locale) {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(d);
    } catch {
      // fallthrough
    }
  }
  return out;
}

export class FormatDateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "date-format",
    name: "Format Date",
    type: "date-format",
    description: "Format a date into a string",
    documentation: `Formats an ISO date using a simple pattern or locale.

### Inputs
- date (date): ISO date
- pattern (string): Pattern tokens YYYY MM DD hh mm ss (UTC)
- locale (string): Optional BCP47 locale for Intl formatting

### Outputs
- text (string): Formatted string`,
    tags: ["Date"],
    icon: "calendar",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "date",
        type: "date",
        description: "Date (ISO-8601)",
        required: true,
      },
      {
        name: "pattern",
        type: "string",
        description:
          "Pattern (e.g., YYYY-MM-DD, hh:mm:ss). If empty, uses locale.",
        required: false,
      },
      {
        name: "locale",
        type: "string",
        description: "Optional BCP47 locale for Intl formatting fallback",
        required: false,
      },
    ],
    outputs: [
      { name: "text", type: "string", description: "Formatted date string" },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const iso = String(context.inputs.date ?? "");
      const pattern =
        (context.inputs.pattern as string) || "YYYY-MM-DDThh:mm:ssZ";
      const locale = (context.inputs.locale as string) || undefined;
      const formatted = formatWithPattern(iso, pattern, locale);
      return this.createSuccessResult({ text: formatted ?? "" });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
