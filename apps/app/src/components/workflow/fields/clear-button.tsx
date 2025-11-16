import { Trash2Icon } from "lucide-react";

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
      className={`p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ${className}`}
      aria-label={label}
      type="button"
    >
      <Trash2Icon className="h-4 w-4" />
    </button>
  );
}
