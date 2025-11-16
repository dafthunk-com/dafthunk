import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/utils";

export interface NodeTagsProps {
  tags: string[];
  functionCalling?: boolean;
  className?: string;
  size?: "sm" | "xs";
}

export function NodeTags({
  tags,
  functionCalling,
  className,
  size = "xs",
}: NodeTagsProps) {
  const allTags = [...tags, ...(functionCalling ? ["Tools"] : [])];

  if (allTags.length === 0) return null;

  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
      {allTags.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant="secondary"
          className={cn(size === "xs" ? "text-xs" : "text-sm")}
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}
