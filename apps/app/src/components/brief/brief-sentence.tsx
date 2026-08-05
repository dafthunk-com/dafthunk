import type { Brief, BriefAnswers, BriefBlank } from "@dafthunk/types";
import { resolveBlank } from "@dafthunk/utils";

import { cn } from "@/utils/utils";

/**
 * The request, read back, with our guesses left visible and tappable.
 *
 * The sentence is the interface. Not a form beside it, not a summary of one —
 * the words a person reads are the same words that drive what gets built, and
 * every guess we made is a span they can reach into and change.
 *
 * The remaining gaps are also the progress indicator. There is no step count,
 * because we cannot honestly know how many questions there will be; what we
 * can show is exactly how much is still unsettled.
 */

/**
 * Whether the segment after a slot opens with punctuation.
 *
 * The slot is a padded, margined inline box, so a following "." or "," is
 * pushed clear of the word it belongs to and the sentence reads "email it to
 * you ." — which looks like a typo in our writing rather than a layout detail.
 */
function startsWithPunctuation(text: string | undefined): boolean {
  return text !== undefined && /^\s*[.,;:!?)\]]/.test(text);
}

interface BriefSlotProps {
  blank: BriefBlank;
  answers: BriefAnswers;
  isOpen: boolean;
  onOpen: () => void;
  /** Drop the trailing gap so adjoining punctuation sits tight. */
  tightRight?: boolean;
}

function BriefSlot({
  blank,
  answers,
  isOpen,
  onOpen,
  tightRight,
}: BriefSlotProps) {
  const answered = Boolean(answers[blank.id]?.trim());
  const text = resolveBlank(blank, answers);

  return (
    <button
      type="button"
      // Keyed on the answer by the parent, so the mount animation replays every
      // time the value changes rather than only on first render.
      onClick={onOpen}
      aria-expanded={isOpen}
      className={cn(
        "ml-0.5 rounded px-1 transition-colors",
        tightRight ? "mr-0 pr-0" : "mr-0.5",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        answered
          ? "bg-primary/10 text-foreground"
          : "border-b-2 border-dashed border-primary/60 italic text-muted-foreground",
        isOpen && "ring-2 ring-primary/40",
        "hover:bg-primary/15"
      )}
    >
      {text}
    </button>
  );
}

export interface BriefSentenceProps {
  brief: Brief;
  answers: BriefAnswers;
  openBlankId: string | null;
  onOpenBlank: (blankId: string | null) => void;
  /** Muted and inert once the sentence is being built from. */
  disabled?: boolean;
}

export function BriefSentence({
  brief,
  answers,
  openBlankId,
  onOpenBlank,
  disabled,
}: BriefSentenceProps) {
  const byId = new Map(brief.blanks.map((blank) => [blank.id, blank]));

  return (
    <p
      className={cn(
        "text-2xl leading-relaxed tracking-tight",
        // The reflow from a short assumption to a longer chosen label glides
        // rather than snapping.
        "transition-all duration-200",
        disabled && "text-muted-foreground"
      )}
    >
      {brief.segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <span key={`text-${index}`}>{segment.text}</span>;
        }

        const blank = byId.get(segment.blankId);
        if (!blank) return null;

        const next = brief.segments[index + 1];
        const tightRight = startsWithPunctuation(
          next?.kind === "text" ? next.text : undefined
        );

        if (disabled) {
          return (
            <span
              key={segment.blankId}
              className={cn("rounded bg-muted px-1", tightRight && "pr-0")}
            >
              {resolveBlank(blank, answers)}
            </span>
          );
        }

        return (
          <BriefSlot
            tightRight={tightRight}
            // The changing key is load-bearing: `animate-in` is a one-shot CSS
            // animation and will not replay on a re-render unless React
            // remounts the element.
            key={`${blank.id}:${answers[blank.id] ?? ""}`}
            blank={blank}
            answers={answers}
            isOpen={openBlankId === blank.id}
            onOpen={() =>
              onOpenBlank(openBlankId === blank.id ? null : blank.id)
            }
          />
        );
      })}
    </p>
  );
}
