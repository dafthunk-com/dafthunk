import { HTMLAttributes, ReactNode } from "react";

interface InsetLayoutProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

export function InsetLayout({ title, children, ...props }: InsetLayoutProps) {
  return (
    <main className="h-full">
      <div className="h-full overflow-auto" {...props}>
        {title && (
          <div className="flex justify-between items-center mb-2 border-b px-6 py-2 sticky top-0 bg-background">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </main>
  );
}
