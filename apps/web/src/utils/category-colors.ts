/**
 * Get category color classes based on category name
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ai: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    image: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    audio:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    net: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    json: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    number:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    parameter: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    document: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    email: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  };

  return (
    colors[category.toLowerCase()] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  );
}
