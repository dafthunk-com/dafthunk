import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  CircleDashed,
  CheckCircle2,
  AlertCircle,
  CircleSlash,
} from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/utils/utils";

// Define the possible status types explicitly
export type ExecutionStatus = "running" | "completed" | "failed" | "cancelled";

// Define the structure for status information
type StatusInfo = {
  icon: React.ElementType;
  color: string;
  variant: VariantProps<typeof badgeVariants>["variant"];
};

// Map status to visual properties
const statusMap: Record<ExecutionStatus, StatusInfo> = {
  running: {
    icon: CircleDashed,
    color: "text-blue-500",
    variant: "translucent-active",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    variant: "translucent-success",
  },
  failed: {
    icon: AlertCircle,
    color: "text-red-500",
    variant: "translucent-error",
  },
  cancelled: {
    icon: CircleSlash,
    color: "text-gray-500",
    variant: "translucent-inactive",
  },
};

// Define component props
type ExecutionStatusBadgeProps = {
  status: ExecutionStatus;
};

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  const statusInfo = statusMap[status] ?? statusMap["cancelled"]; // Default for safety
  const Icon = statusInfo.icon;

  return (
    <Badge
      variant={statusInfo.variant}
      className="capitalize flex items-center space-x-1 w-fit"
    >
      <Icon
        className={cn(
          "size-3 me-1",
          statusInfo.color,
          status === "running" ? "animate-spin" : ""
        )}
      />
      <span>{status}</span>
    </Badge>
  );
}
