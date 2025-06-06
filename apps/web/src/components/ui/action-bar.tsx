import React from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/utils";

export interface ActionBarGroupProps {
  children: React.ReactNode;
  vertical?: boolean;
  className?: string;
}

export function ActionBarGroup({
  children,
  vertical = false,
  className = "",
}: ActionBarGroupProps) {
  const horizontalClasses =
    "flex items-center gap-0.5 [&>*:first-child]:rounded-l-lg [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-r-lg [&>*:last-child]:rounded-l-none [&>*:only-child]:rounded-lg";
  const verticalClasses =
    "flex flex-col items-center gap-0.5 [&>*:first-child]:rounded-t-lg [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-b-lg [&>*:last-child]:rounded-t-none [&>*:only-child]:rounded-lg";

  return (
    <div
      className={cn(vertical ? verticalClasses : horizontalClasses, className)}
    >
      {children}
    </div>
  );
}

export interface ActionBarButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

export function ActionBarButton({
  onClick,
  disabled = false,
  className = "",
  tooltip,
  children,
  tooltipSide = "top",
}: ActionBarButtonProps) {
  const trigger = (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn("h-10 px-3 rounded-none", className, {
        "opacity-50 cursor-not-allowed": disabled,
      })}
    >
      {children}
    </Button>
  );
  if (!tooltip) {
    return trigger;
  }
  return (
    <Tooltip delayDuration={0}>
      <div className="bg-background rounded-none overflow-hidden">
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </div>
    </Tooltip>
  );
}
