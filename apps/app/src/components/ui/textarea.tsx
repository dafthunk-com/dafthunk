import * as React from "react";

import { cn } from "@/utils/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/** The app's boxed text field, so a growing one can wear the same skin. */
export const textareaClassName =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaClassName, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

/**
 * A field that is as tall as what is in it.
 *
 * One grid cell holds the textarea and an invisible copy of the same words in
 * the same type, so the cell is sized by the wrapped text and the field
 * stretches to fill it — the box grows line by line, with no scrollbar and no
 * measuring on every keystroke. `rows` and any `min-h` are the floor, and an
 * empty field mirrors its placeholder so a long hint never clips.
 *
 * Mechanism only: whatever `className` it is given dresses the field and the
 * mirror alike, which is what keeps their wrapping identical — a bare hero
 * input and a boxed form field both grow, each in its own type.
 */
export function GrowingTextarea({
  className,
  value,
  placeholder,
  ...props
}: Omit<TextareaProps, "value"> & { value: string }) {
  return (
    <div className="grid">
      <textarea
        className={cn(
          className,
          "col-start-1 row-start-1 resize-none overflow-hidden"
        )}
        value={value}
        placeholder={placeholder}
        {...props}
      />
      <div
        aria-hidden
        className={cn(
          className,
          // `block` overrides whatever display the skin brought: the mirror
          // has to wrap as flow text for its height to mean anything.
          "invisible col-start-1 row-start-1 block whitespace-pre-wrap break-words"
        )}
      >
        {/* The trailing space is what keeps a newline at the end of the text
            from being trimmed away with the line it opened. */}
        {`${value || placeholder || ""} `}
      </div>
    </div>
  );
}

export { Textarea };
