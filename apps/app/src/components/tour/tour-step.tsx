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
        "z-[60] w-[560px] h-[380px] rounded-lg border bg-popover p-10 text-popover-foreground shadow-lg",
        "animate-in fade-in-0 zoom-in-95",
        "flex flex-col justify-center"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>

        {/* Title + Content (centered in remaining space) */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <h3 className="font-semibold text-3xl leading-tight text-center">
            {step.title}
          </h3>
          <p className="text-lg text-muted-foreground leading-relaxed text-center">
            {step.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" onClick={onPrev}>
                Previous
              </Button>
            )}
            <Button onClick={onNext}>{isLast ? "Finish" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
