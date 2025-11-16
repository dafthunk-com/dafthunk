import type { ReactNode } from "react";

/**
 * Utility for highlighting matching text in search results
 */

/**
 * Highlights matching text by wrapping matches in <mark> elements
 * Supports multi-word search terms with individual word highlighting
 */
export function highlightMatch(text: string, searchTerm: string): ReactNode {
  if (!searchTerm.trim()) return text;

  // Split search term into individual words and escape special regex characters
  const words = searchTerm
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((word) => word.length > 0);

  if (words.length === 0) return text;

  // Create a regex that matches any of the words
  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    // Check if this part matches any of the search words
    if (words.some((word) => new RegExp(`^${word}$`, "i").test(part))) {
      return (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900 font-semibold"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}
