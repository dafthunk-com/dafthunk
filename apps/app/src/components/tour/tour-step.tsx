import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";

import type { TourStep } from "./tour-steps";

interface TourStepPopoverProps {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function TourStepPopover({
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: TourStepPopoverProps) {
  return (
    <div
      className={cn(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        "z-[60] w-96 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-5 text-popover-foreground shadow-lg",
        "animate-in fade-in-0 zoom-in-95"
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight">{step.title}</h3>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {stepNumber} / {totalSteps}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.content}
        </p>

        {/* Step indicators */}
        <div className="flex justify-center gap-1 py-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all",
                i === stepNumber - 1 ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={onPrev}>
                Previous
              </Button>
            )}
            <Button size="sm" onClick={onNext}>
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
