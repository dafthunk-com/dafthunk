// Registry functions
export type { ProviderName } from "./registry";
export { getAllProviders, getProvider, isValidProvider } from "./registry";

// Base class
export { OAuthProvider } from "./OAuthProvider";

// Types
export type {
  DiscordToken,
  DiscordUser,
  GitHubToken,
  GitHubUser,
  GoogleToken,
  GoogleUser,
  LinkedInToken,
  LinkedInUser,
  OAuthState,
  RedditToken,
  RedditUser,
  ValidatedState,
} from "./types";

// Errors
export { OAuthError } from "./types";
