import LoaderCircle from "lucide-react/icons/loader-circle";

import { cn } from "@/utils/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin text-muted-foreground", className)}
      {...props}
    >
      <LoaderCircle className="size-4" />
    </div>
  );
}
