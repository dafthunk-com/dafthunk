import { cn } from "@/utils/utils";

/**
 * The stage lights behind /start.
 *
 * Three blurred color fields drifting slowly behind the sentence: a whisper
 * on the front door and the readback, full bloom while the model works, dark
 * when the session has settled or gone wrong. The levels are opacity on one
 * persistent element, so the bloom is a slow crossfade rather than a scene
 * cut — the page must keep this component mounted at a stable position
 * across screen changes for that to hold.
 *
 * Deliberately the only colorful thing on the page: the interface stays
 * monochrome text, and the light show stays behind it.
 */
export type AuroraLevel = "off" | "ambient" | "active";

const LEVEL_OPACITY: Record<AuroraLevel, string> = {
  off: "opacity-0",
  ambient: "opacity-50 dark:opacity-40",
  active: "opacity-100",
};

export function ThinkingAurora({ level }: { level: AuroraLevel }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000",
        LEVEL_OPACITY[level]
      )}
    >
      <div className="aurora-blob aurora-violet aurora-drift-1 -left-[10%] -top-[20%] size-[55vh]" />
      <div className="aurora-blob aurora-cyan aurora-drift-2 -right-[15%] top-[10%] size-[50vh]" />
      <div className="aurora-blob aurora-rose aurora-drift-3 -bottom-[25%] left-[20%] size-[45vh]" />
    </div>
  );
}
