import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { normalizeUnit, type Unit } from "../../node-utils";

function addToDate(
  iso: string,
  amount: number,
  unit: Unit
): string | undefined {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  switch (unit) {
    case "milliseconds":
      d.setTime(d.getTime() + amount);
      break;
    case "seconds":
      d.setSeconds(d.getSeconds() + amount);
      break;
    case "minutes":
      d.setMinutes(d.getMinutes() + amount);
      break;
    case "hours":
      d.setHours(d.getHours() + amount);
      break;
    case "days":
      d.setDate(d.getDate() + amount);
      break;
    case "weeks":
      d.setDate(d.getDate() + amount * 7);
      break;
    case "months":
      d.setMonth(d.getMonth() + amount);
      break;
    case "years":
      d.setFullYear(d.getFullYear() + amount);
      break;
    default:
      return undefined;
  }
  return d.toISOString();
}

export class AddDateNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "date-add",
    name: "Add to Date",
    type: "date-add",
    description: "Add an amount of time to a date",
    documentation:
      "Adds a time offset to an ISO date. ### Inputs date (date): Base date in ISO amount (number): Amount to add (negative to subtract) unit (string): One of milliseconds, seconds, minutes, hours, days, weeks, months, years ### Outputs date (date): Resulting ISO date",
    tags: ["Time", "Date", "Add"],
    icon: "calendar",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "date",
        type: "date",
        description: "Base date (ISO-8601)",
        required: true,
      },
      {
        name: "amount",
        type: "number",
        description: "Amount to add (can be negative)",
        required: true,
      },
      {
        name: "unit",
        type: "string",
        description:
          "Unit to add: milliseconds, seconds, minutes, hours, days, weeks, months, years",
        required: true,
      },
    ],
    outputs: [
      { name: "date", type: "date", description: "Resulting date (ISO-8601)" },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const base = context.inputs.date as string;
      const amount = Number(context.inputs.amount);
      const unitInput = String(context.inputs.unit);
      const unit = normalizeUnit(unitInput);

      const iso = unit ? addToDate(base, amount, unit) : undefined;
      return this.createSuccessResult({ date: iso });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
