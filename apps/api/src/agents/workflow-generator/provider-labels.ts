/**
 * Provider ids are wire values — "google-mail", "x" — and reading one back at
 * someone as "your x account" looks like a bug even when it is not.
 */
const PROVIDER_LABELS: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  discord: "Discord",
  reddit: "Reddit",
  github: "GitHub",
  wordpress: "WordPress",
  "google-mail": "Gmail",
  "google-calendar": "Google Calendar",
  "microsoft-teams": "Microsoft Teams",
  "office-365": "Office 365",
};

/** A human-readable name for a provider id, falling back to the id itself. */
export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}
