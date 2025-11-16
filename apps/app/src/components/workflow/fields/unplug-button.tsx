import { UnplugIcon } from "lucide-react";

interface UnplugButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function UnplugButton({
  onClick,
  label = "Disconnect",
  className = "",
}: UnplugButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-1 text-muted-foreground hover:text-foreground ${className}`}
      aria-label={label}
      type="button"
    >
      <UnplugIcon className="h-4 w-4" />
    </button>
  );
}
