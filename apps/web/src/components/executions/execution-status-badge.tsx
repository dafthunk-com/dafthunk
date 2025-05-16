import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  CircleDashed,
  CheckCircle2,
  AlertCircle,
  CircleSlash,
} from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/utils/utils";
import type { WorkflowExecution } from "@dafthunk/types";

// Define the possible status types explicitly
// Define the structure for status information
type StatusInfo = {
  icon: React.ElementType;
  color: string;
  variant: VariantProps<typeof badgeVariants>["variant"];
};

// Map status to visual properties
const statusMap: Record<WorkflowExecution["status"], StatusInfo> = {
  submitted: {
    icon: CircleDashed,
    color: "text-blue-500",
    variant: "translucent-active",
  },
  executing: {
    icon: CircleDashed,
    color: "text-blue-500",
    variant: "translucent-active",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    variant: "translucent-success",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    variant: "translucent-error",
  },
  cancelled: {
    icon: CircleSlash,
    color: "text-gray-500",
    variant: "translucent-inactive",
  },
  paused: {
    icon: CircleDashed,
    color: "text-blue-500",
    variant: "translucent-active",
  },
};

// Define component props
type ExecutionStatusBadgeProps = {
  status: WorkflowExecution["status"];
};

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  const statusInfo = statusMap[status] ?? statusMap["submitted"];
  const Icon = statusInfo.icon;

  return (
    <Badge
      variant={statusInfo.variant}
      className="capitalize flex items-center space-x-1 w-fit"
    >
      <Icon
        className={cn(
          "size-3 mr-0.5",
          statusInfo.color,
          status === "executing" ? "animate-spin" : ""
        )}
      />
      <span>{status}</span>
    </Badge>
  );
}
