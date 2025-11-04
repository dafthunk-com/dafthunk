import { NodeExecution, NodeType } from "@dafthunk/types";

import { normalizeUnit, type Unit } from "../../node-utils";
import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

function diffInUnit(
  aIso: string,
  bIso: string,
  unit: Unit
): number | undefined {
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return undefined;
  const ms = a.getTime() - b.getTime();
  switch (unit) {
    case "milliseconds":
      return ms;
    case "seconds":
      return ms / 1000;
    case "minutes":
      return ms / (1000 * 60);
    case "hours":
      return ms / (1000 * 60 * 60);
    case "days":
      return ms / (1000 * 60 * 60 * 24);
    case "weeks":
      return ms / (1000 * 60 * 60 * 24 * 7);
    case "months": {
      // Approximate months by calendar difference to be more intuitive
      const years = a.getUTCFullYear() - b.getUTCFullYear();
      const months = a.getUTCMonth() - b.getUTCMonth();
      const dayOffset = (a.getUTCDate() - b.getUTCDate()) / 31; // coarse adjustment
      return years * 12 + months + dayOffset;
    }
    case "years": {
      const years = a.getUTCFullYear() - b.getUTCFullYear();
      const monthFrac = (a.getUTCMonth() - b.getUTCMonth()) / 12;
      return years + monthFrac;
    }
    default:
      return undefined;
  }
}

export class DiffDateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "date-diff",
    name: "Date Difference",
    type: "date-diff",
    description: "Compute the difference between two dates in a given unit",
    documentation:
      "Computes the difference a - b in a specified unit. ### Inputs a (date): First date (ISO) b (date): Second date (ISO) unit (string): milliseconds, seconds, minutes, hours, days, weeks, months, years absolute (boolean): If true, returns absolute value ### Outputs value (number): Difference in chosen unit",
    tags: ["Time", "Date", "Diff"],
    icon: "calendar",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "a",
        type: "date",
        description: "First date (ISO-8601)",
        required: true,
      },
      {
        name: "b",
        type: "date",
        description: "Second date (ISO-8601)",
        required: true,
      },
      {
        name: "unit",
        type: "string",
        description:
          "Unit: milliseconds, seconds, minutes, hours, days, weeks, months, years",
        required: true,
      },
      {
        name: "absolute",
        type: "boolean",
        description: "Return absolute difference (non-negative)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "number",
        description: "Difference value in the chosen unit",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const a = String(context.inputs.a ?? "");
      const b = String(context.inputs.b ?? "");
      const unitInput = String(context.inputs.unit ?? "milliseconds");
      const unit = normalizeUnit(unitInput);

      if (!unit) {
        return this.createErrorResult(
          `Invalid unit: ${unitInput}. Must be one of: milliseconds, seconds, minutes, hours, days, weeks, months, years`
        );
      }

      const absolute = Boolean(context.inputs.absolute ?? false);
      const value = diffInUnit(a, b, unit);
      const out =
        value === undefined ? undefined : absolute ? Math.abs(value) : value;
      return this.createSuccessResult({ value: out });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
