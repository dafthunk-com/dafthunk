import { cn } from "@/utils/utils";

/**
 * Placeholder shown when a field is disabled and has no value.
 * Mirrors the disabled <Input> look (border-input, bg-background, opacity-50).
 */
export function FieldPlaceholder({
  className,
  connected,
  label,
}: {
  className?: string;
  connected?: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed",
        className
      )}
    >
      {connected ? "Connected" : label}
    </div>
  );
}
