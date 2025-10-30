import { XIcon } from "lucide-react";

interface ClearButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function ClearButton({
  onClick,
  label = "Clear value",
  className = "",
}: ClearButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-1 text-muted-foreground hover:text-foreground transition-colors ${className}`}
      aria-label={label}
      type="button"
    >
      <XIcon className="h-4 w-4" />
    </button>
  );
}
