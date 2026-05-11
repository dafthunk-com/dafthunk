import { format, formatDistanceToNowStrict } from "date-fns";

export function formatDate(date: string | Date): string {
  try {
    return format(new Date(date), "MMM d, yyyy h:mm a");
  } catch {
    return String(date);
  }
}

export function formatRelativeDate(date: string | Date): string {
  try {
    return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
  } catch {
    return String(date);
  }
}
