import { User } from "@/services/authService";

/**
 * Gets the GitHub avatar URL for a user
 * @param user The user object
 * @returns The GitHub avatar URL
 */
export function getGitHubAvatarUrl(user: User): string {
  // If avatarUrl is already provided, use it
  if (user.avatarUrl) {
    return user.avatarUrl;
  }
  
  // Otherwise, construct the URL using the GitHub ID
  return `https://avatars.githubusercontent.com/u/${user.id}`;
}

/**
 * Gets the initials from a user's name
 * @param name The user's name
 * @returns The initials (up to 2 characters)
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
} 