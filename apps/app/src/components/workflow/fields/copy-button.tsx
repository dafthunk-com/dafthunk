import CheckIcon from "lucide-react/icons/check";
import CopyIcon from "lucide-react/icons/copy";
import { useState } from "react";

import { cn } from "@/utils/utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function CopyButton({
  value,
  label = "Copy value",
  className = "",
  disabled = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail if document is not focused or permissions denied
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
        disabled &&
          "opacity-50 cursor-not-allowed hover:text-neutral-400 dark:hover:text-neutral-400",
        className
      )}
      aria-label={label}
      type="button"
      disabled={disabled}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </button>
  );
}
