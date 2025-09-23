import type { WorkflowExecution } from "@dafthunk/types";
import type { VariantProps } from "class-variance-authority";
import AlertCircle from "lucide-react/icons/alert-circle";
import CheckCircle2 from "lucide-react/icons/check-circle-2";
import CircleDashed from "lucide-react/icons/circle-dashed";
import CircleSlash from "lucide-react/icons/circle-slash";
import Zap from "lucide-react/icons/zap";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/utils/utils";

// Define the structure for status information
type StatusInfo = {
  icon: React.ComponentType<{ className?: string }>;
  variant: VariantProps<typeof badgeVariants>["variant"];
};

// Map status to visual properties
const statusMap: Record<WorkflowExecution["status"], StatusInfo> = {
  idle: {
    icon: CircleDashed,
    variant: "translucent-inactive",
  },
  submitted: {
    icon: CircleDashed,
    variant: "translucent-active",
  },
  executing: {
    icon: CircleDashed,
    variant: "translucent-warning",
  },
  completed: {
    icon: CheckCircle2,
    variant: "translucent-success",
  },
  error: {
    icon: AlertCircle,
    variant: "translucent-error",
  },
  cancelled: {
    icon: CircleSlash,
    variant: "translucent-inactive",
  },
  paused: {
    icon: CircleDashed,
    variant: "translucent-active",
  },
  exhausted: {
    icon: Zap,
    variant: "translucent-error",
  },
};

// Define component props
type ExecutionStatusBadgeProps = {
  status: WorkflowExecution["status"];
};

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  const statusInfo = statusMap[status] ?? statusMap["submitted"];
  const Icon = statusInfo.icon;

  const iconClasses = cn(
    "size-3",
    "mr-0.5",
    status === "executing" && "animate-spin"
  );

  return (
    <Badge
      variant={statusInfo.variant}
      className="capitalize flex items-center space-x-1 w-fit"
    >
      <Icon className={iconClasses} />
      <span>{status}</span>
    </Badge>
  );
}
