import { cn } from "@/utils/utils";
import { type ReactNode } from "react";

interface CodeProps {
  children: ReactNode;
  className?: string;
  language?: string;
}

export const Code = ({
  children,
  className,
  language,
}: CodeProps) => {
  return (
    <pre
      className={cn(
        "rounded-md bg-secondary p-4 font-mono text-sm",
        className
      )}
      data-language={language}
    >
      <code className="whitespace-pre-wrap">{children}</code>
    </pre>
  );
}; 