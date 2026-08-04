import type { IntegrationProvider } from "@dafthunk/types";

import type { Bindings } from "../context";

/**
 * OAuth providers this deployment can actually offer.
 *
 * A provider is only real if both halves of its client credential are present,
 * so the set varies by environment. Two callers need the same answer for
 * different reasons: the integrations page lists what you can connect, and the
 * workflow generator decides whether "post it to LinkedIn" is a destination
 * worth offering — proposing one the deployment cannot complete is worse than
 * not proposing it at all.
 */
const PROVIDER_CREDENTIALS: ReadonlyArray<
  [IntegrationProvider, keyof Bindings, keyof Bindings]
> = [
  [
    "google-mail",
    "INTEGRATION_GOOGLE_MAIL_CLIENT_ID",
    "INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET",
  ],
  [
    "google-calendar",
    "INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID",
    "INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET",
  ],
  [
    "discord",
    "INTEGRATION_DISCORD_CLIENT_ID",
    "INTEGRATION_DISCORD_CLIENT_SECRET",
  ],
  [
    "reddit",
    "INTEGRATION_REDDIT_CLIENT_ID",
    "INTEGRATION_REDDIT_CLIENT_SECRET",
  ],
  [
    "linkedin",
    "INTEGRATION_LINKEDIN_CLIENT_ID",
    "INTEGRATION_LINKEDIN_CLIENT_SECRET",
  ],
  [
    "github",
    "INTEGRATION_GITHUB_CLIENT_ID",
    "INTEGRATION_GITHUB_CLIENT_SECRET",
  ],
  ["x", "INTEGRATION_X_CLIENT_ID", "INTEGRATION_X_CLIENT_SECRET"],
  [
    "wordpress",
    "INTEGRATION_WORDPRESS_CLIENT_ID",
    "INTEGRATION_WORDPRESS_CLIENT_SECRET",
  ],
];

/** Providers whose OAuth credentials are configured in this environment. */
export function availableIntegrationProviders(
  env: Bindings
): IntegrationProvider[] {
  return PROVIDER_CREDENTIALS.filter(
    ([, clientId, clientSecret]) => env[clientId] && env[clientSecret]
  ).map(([provider]) => provider);
}
