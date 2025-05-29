import { cn } from "@/utils/utils";

interface CalloutProps {
  children: React.ReactNode;
  type?: "note" | "warning" | "tip" | "danger";
}

export function Callout({ children, type = "note" }: CalloutProps) {
  const variants = {
    note: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
    warning:
      "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
    tip: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
    danger:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  };

  return (
    <div className={cn("border-l-4 p-4 my-6 rounded-r-lg", variants[type])}>
      {children}
    </div>
  );
}
