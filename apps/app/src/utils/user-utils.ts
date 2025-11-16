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
