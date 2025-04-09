import { User } from "@/services/authService";

/**
 * Gets the avatar URL for a user based on their provider.
 * Prioritizes the avatarUrl field if provided by the backend.
 * Falls back to constructing a GitHub URL if the provider is GitHub and githubId is available.
 * @param user The user object from authContext
 * @returns The avatar URL or undefined if not available.
 */
export function getAvatarUrl(user: User): string | undefined {
  // 1. Prioritize avatarUrl if provided directly by the auth service
  if (user.avatarUrl) {
    return user.avatarUrl;
  }

  // 2. Fallback for GitHub using githubId if avatarUrl is not present
  if (user.provider === "github" && user.githubId) {
    return `https://avatars.githubusercontent.com/u/${user.githubId}`;
  }

  // 3. Google avatars are typically fetched and stored in avatarUrl by the backend.
  //    There isn't a standard client-side way to construct it from googleId.

  // 4. Return undefined if no avatar URL can be determined
  return undefined;
}

/**
 * Gets the initials from a user's name
 * @param name The user's name
 * @returns The initials (up to 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return "?"; // Handle cases where name might be empty
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean) // Remove undefined/empty strings resulting from multiple spaces
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
