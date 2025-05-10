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
    <main className="h-full">
      <div className="h-full overflow-auto" {...props}>
        {title && (
          <div
            className={cn(
              "flex justify-between items-center mb-2 border-b px-6 py-2 sticky top-0 bg-background z-10",
              titleClassName
            )}
          >
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {titleRight}
          </div>
        )}
        <div className={cn("px-6 py-4", childrenClassName)}>{children}</div>
      </div>
    </main>
  );
}
