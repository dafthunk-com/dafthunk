import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/utils";

interface InsetLayoutProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
  titleRight?: ReactNode;
  childrenClassName?: string;
  titleClassName?: string;
}

export function InsetLayout({
  title,
  children,
  titleRight,
  childrenClassName,
  titleClassName,
  ...props
}: InsetLayoutProps) {
  return (
    <div className={cn("px-6 py-8", childrenClassName)} {...props}>
      {title && (
        <div
          className={cn(
            "flex justify-between items-center mb-4",
            titleClassName
          )}
        >
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
}
