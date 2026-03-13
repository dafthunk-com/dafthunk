import { format } from "date-fns";

export function formatDate(date: string | Date): string {
  try {
    return format(new Date(date), "MMM d, yyyy h:mm a");
  } catch {
    return String(date);
  }
}
