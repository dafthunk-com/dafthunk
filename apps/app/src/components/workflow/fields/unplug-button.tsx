import { UnplugIcon } from "lucide-react";

import { cn } from "@/utils/utils";

interface UnplugButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function UnplugButton({
  onClick,
  label = "Disconnect",
  className = "",
  disabled = false,
}: UnplugButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-1 text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed hover:text-muted-foreground",
        className
      )}
      aria-label={label}
      type="button"
      disabled={disabled}
    >
      <UnplugIcon className="h-4 w-4" />
    </button>
  );
}
