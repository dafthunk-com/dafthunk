export type Unit =
  | "milliseconds"
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "years";

/**
 * Normalize singular unit names to plural form
 * e.g., "hour" -> "hours", "second" -> "seconds"
 */
export function normalizeUnit(input: string): Unit | undefined {
  const normalized = input.toLowerCase().trim();
  const singularToPlural: Record<string, Unit> = {
    millisecond: "milliseconds",
    second: "seconds",
    minute: "minutes",
    hour: "hours",
    day: "days",
    week: "weeks",
    month: "months",
    year: "years",
  };

  // Check if it's already plural or singular
  if (
    normalized === "milliseconds" ||
    normalized === "seconds" ||
    normalized === "minutes" ||
    normalized === "hours" ||
    normalized === "days" ||
    normalized === "weeks" ||
    normalized === "months" ||
    normalized === "years"
  ) {
    return normalized as Unit;
  }

  return singularToPlural[normalized];
}
