import type { BriefBlank } from "@dafthunk/types";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

/**
 * The question for one gap.
 *
 * Opens *below* the sentence rather than in a popover: a popover would cover
 * the thing being edited, and the sentence is the product.
 *
 * An open blank is prefilled with our proposal, never left blank. Handing
 * someone an empty required field asks them to supply a word we could have
 * guessed, in vocabulary they may not have yet.
 */
export interface BriefBlankCardProps {
  blank: BriefBlank;
  value: string | undefined;
  onAnswer: (value: string) => void;
  onDismiss: () => void;
}

export function BriefBlankCard({
  blank,
  value,
  onAnswer,
  onDismiss,
}: BriefBlankCardProps) {
  const [draft, setDraft] = useState(
    value ?? (blank.type === "open" ? blank.prefill : "")
  );

  const commitOpen = () => {
    const trimmed = draft.trim();
    if (trimmed) onAnswer(trimmed);
    onDismiss();
  };

  return (
    <div
      id={`brief-blank-${blank.id}`}
      className="animate-in fade-in-0 slide-in-from-top-1 space-y-3 rounded-lg border bg-card p-4 duration-200 motion-reduce:animate-none"
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">{blank.question}</p>
        {blank.why && (
          <p className="text-xs text-muted-foreground">{blank.why}</p>
        )}
      </div>

      {blank.type === "choice" ? (
        <div className="flex flex-wrap gap-2">
          {blank.options.map((option) => {
            const selected = (value ?? blank.assumed) === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.hint}
                onClick={() => {
                  onAnswer(option.id);
                  onDismiss();
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={draft}
            maxLength={blank.maxLength}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitOpen}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitOpen();
              if (event.key === "Escape") onDismiss();
            }}
          />
          <Button variant="secondary" onClick={commitOpen}>
            Use this
          </Button>
        </div>
      )}
    </div>
  );
}
