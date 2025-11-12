import type { OAuthProvider } from "./OAuthProvider";
import { DiscordProvider } from "./providers/DiscordProvider";
import { GitHubProvider } from "./providers/GitHubProvider";
import { GoogleCalendarProvider } from "./providers/GoogleCalendarProvider";
import { GoogleMailProvider } from "./providers/GoogleMailProvider";
import { LinkedInProvider } from "./providers/LinkedInProvider";
import { MicrosoftTeamsProvider } from "./providers/MicrosoftTeamsProvider";
import { Office365Provider } from "./providers/Office365Provider";
import { RedditProvider } from "./providers/RedditProvider";

// Instantiate all providers
const providers = {
  "google-mail": new GoogleMailProvider(),
  "google-calendar": new GoogleCalendarProvider(),
  discord: new DiscordProvider(),
  linkedin: new LinkedInProvider(),
  reddit: new RedditProvider(),
  github: new GitHubProvider(),
  "microsoft-teams": new MicrosoftTeamsProvider(),
  "office-365": new Office365Provider(),
} as const;

export type ProviderName = keyof typeof providers;

/**
 * Get an OAuth provider by name
 * @throws {Error} if provider not found
 */
export function getProvider(name: string): OAuthProvider<any, any> {
  const provider = providers[name as ProviderName];
  if (!provider) {
    const available = Object.keys(providers).join(", ");
    throw new Error(
      `Unknown OAuth provider: ${name}. Available providers: ${available}`
    );
  }
  return provider;
}

/**
 * Get all registered OAuth providers
 */
export function getAllProviders(): OAuthProvider<any, any>[] {
  return Object.values(providers);
}

/**
 * Check if a provider name is valid
 */
export function isValidProvider(name: string): name is ProviderName {
  return name in providers;
}
