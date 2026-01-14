import { CircleDollarSign } from "lucide-react";
import { Link } from "react-router";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrgUrl } from "@/hooks/use-org-url";
import { cn } from "@/utils/utils";

interface SubscriptionBadgeProps {
  className?: string;
  variant?: "default" | "muted";
  size?: "sm" | "md" | "lg";
}

/**
 * Badge indicating a feature requires a paid subscription.
 * Clicking navigates to the billing page.
 */
export function SubscriptionBadge({
  className,
  variant = "default",
  size = "md",
}: SubscriptionBadgeProps) {
  const { getOrgUrl } = useOrgUrl();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={getOrgUrl("billing")}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center rounded-full p-1",
            "transition-colors",
            variant === "default" && [
              "text-amber-600 hover:text-amber-700 hover:bg-amber-100",
              "dark:text-amber-500 dark:hover:text-amber-400 dark:hover:bg-amber-900/30",
            ],
            variant === "muted" && [
              "text-neutral-400 hover:text-neutral-700",
              "dark:text-neutral-500 dark:hover:text-neutral-300",
            ],
            className
          )}
        >
          <CircleDollarSign
            className={cn(
              size === "sm" && "h-3 w-3",
              size === "md" && "h-4 w-4",
              size === "lg" && "h-5 w-5"
            )}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">Subscription required</p>
      </TooltipContent>
    </Tooltip>
  );
}
