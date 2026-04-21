import type { ReactNode } from "react";

import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import { DocsSidebar } from "./docs-sidebar";

interface DocsLayoutProps {
  children: ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 bg-dot-grid flex flex-col overflow-x-clip">
      <SiteHeader />
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 pt-24 pb-32 flex flex-col lg:flex-row gap-6 lg:gap-12">
        <DocsSidebar />
        <main className="flex-1 min-w-0">
          <article className="prose prose-gray max-w-none">{children}</article>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
