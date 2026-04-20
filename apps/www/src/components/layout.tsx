import type { ReactNode } from "react";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-stone-100 bg-dot-grid flex flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1 max-w-screen-2xl mx-auto w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
