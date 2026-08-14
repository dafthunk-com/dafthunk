import type {
  Brief,
  BriefAnswers,
  BriefBlank,
  GenerationPhase,
} from "@dafthunk/types";
import { isAskedBlank, resolveBlank } from "@dafthunk/utils";
import type { CSSProperties } from "react";

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
 * How the sentence shows the model working, phase by phase.
 *
 * The words are the interface, so the wait animates the words rather than
 * parking a spinner beside them — and the treatment tracks what the model is
 * actually doing: a reading sweep while it drafts, the slots weighed in turn
 * while it chooses pieces, a brightening pass while it checks its own work.
 * Phases with no entry (approving, complete) leave the sentence still.
 */
type SentenceActivity = "sweep" | "slots" | "fill";

const PHASE_ACTIVITY: Partial<Record<GenerationPhase, SentenceActivity>> = {
  briefing: "sweep",
  selecting: "slots",
  planning: "slots",
  generating: "sweep",
  validating: "fill",
  repairing: "fill",
  saving: "sweep",
  running: "sweep",
};

/**
 * The thinking treatment for plain, unstructured sentence text — the rail's
 * echo has no slots to weigh, so those phases fall back to the sweep.
 */
export function thinkingTextClass(
  phase: GenerationPhase | undefined
): string | undefined {
  const activity = phase ? PHASE_ACTIVITY[phase] : undefined;
  if (!activity) return undefined;
  return activity === "fill" ? "thinking-fill" : "thinking-sweep";
}

/** One beat of the readback cascade — the gap between adjacent words. */
const CASCADE_BEAT_MS = 40;

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
  /** Where this slot falls in the readback cascade, in milliseconds. */
  entranceDelayMs?: number;
}

function BriefSlot({
  blank,
  answers,
  isOpen,
  onOpen,
  tightRight,
  entranceDelayMs,
}: BriefSlotProps) {
  const answered = Boolean(answers[blank.id]?.trim());
  // A demoted blank renders in the answered style from the start: it carries a
  // guess the user may ignore, and quiet is what keeps it from reading as one
  // more question. The dashed style is reserved for open questions.
  const quiet = answered || !isAskedBlank(blank);
  const text = resolveBlank(blank, answers);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={isOpen}
      aria-controls={`brief-blank-${blank.id}`}
      aria-label={`${blank.question} Currently: ${text}`}
      style={
        entranceDelayMs !== undefined
          ? { animationDelay: `${entranceDelayMs}ms` }
          : undefined
      }
      className={cn(
        "ml-0.5 rounded px-1 transition-colors",
        entranceDelayMs !== undefined && "brief-slot-land",
        tightRight ? "mr-0 pr-0" : "mr-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        quiet
          ? "bg-primary/10 text-foreground"
          : "border-b-2 border-dashed border-primary/60 italic text-muted-foreground",
        isOpen && "ring-2 ring-primary/40",
        "hover:bg-primary/15"
      )}
    >
      {/* The animation lives on an inner span keyed by the value, so choosing
          an answer replays it without remounting the button itself — a remount
          here is what used to throw keyboard focus back to <body>. */}
      <span
        key={text}
        className="inline-block animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        {text}
      </span>
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
  /**
   * The build phase while the sentence is disabled — the words animate to
   * show where the model's attention is instead of going flat.
   */
  phase?: GenerationPhase;
}

export function BriefSentence({
  brief,
  answers,
  openBlankId,
  onOpenBlank,
  disabled,
  phase,
}: BriefSentenceProps) {
  const byId = new Map(brief.blanks.map((blank) => [blank.id, blank]));
  const activity = disabled && phase ? PHASE_ACTIVITY[phase] : undefined;
  // The stagger order for the slot-weighing treatment, counted as slots
  // render so gaps in the segment list cannot skip a beat.
  let slotOrder = 0;
  // The readback cascade's clock: every word and every slot takes the next
  // beat, so the sentence arrives in reading order regardless of how the
  // segments divide it.
  let beat = 0;

  return (
    <p
      className={cn(
        "text-2xl leading-relaxed tracking-tight",
        disabled && "text-muted-foreground",
        activity === "sweep" && "thinking-sweep",
        activity === "fill" && "thinking-fill"
      )}
    >
      {brief.segments.map((segment, index) => {
        if (segment.kind === "text") {
          // Disabled, the thinking treatments own the text; live, each word
          // takes its beat in the cascade. Whitespace tokens pass through
          // raw so wrapping and screen-reader flow stay untouched.
          if (disabled) {
            return <span key={`text-${index}`}>{segment.text}</span>;
          }
          return (
            <span key={`text-${index}`}>
              {segment.text.split(/(\s+)/).map((token, tokenIndex) =>
                token.trim() ? (
                  <span
                    key={`word-${tokenIndex}`}
                    className="brief-word"
                    style={{ animationDelay: `${beat++ * CASCADE_BEAT_MS}ms` }}
                  >
                    {token}
                  </span>
                ) : (
                  token
                )
              )}
            </span>
          );
        }

        const blank = byId.get(segment.blankId);
        if (!blank) return null;

        const next = brief.segments[index + 1];
        const tightRight = startsWithPunctuation(
          next?.kind === "text" ? next.text : undefined
        );

        if (disabled) {
          const order = slotOrder++;
          return (
            <span
              key={segment.blankId}
              // The sweep and fill paint the paragraph's text transparent to
              // hold their gradient, so the slot restates its solid color —
              // the filled-in words stay legible while the prose shimmers.
              style={
                activity === "slots"
                  ? ({ "--slot-index": order } as CSSProperties)
                  : undefined
              }
              className={cn(
                "rounded bg-muted px-1 text-muted-foreground",
                tightRight && "pr-0",
                activity === "slots" && "thinking-slot"
              )}
            >
              {resolveBlank(blank, answers)}
            </span>
          );
        }

        return (
          <BriefSlot
            tightRight={tightRight}
            key={blank.id}
            blank={blank}
            answers={answers}
            isOpen={openBlankId === blank.id}
            entranceDelayMs={beat++ * CASCADE_BEAT_MS}
            onOpen={() =>
              onOpenBlank(openBlankId === blank.id ? null : blank.id)
            }
          />
        );
      })}
    </p>
  );
}
