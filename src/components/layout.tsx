import { ReactNode } from "react";
import { NavBar } from "./navbar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <NavBar />
      <div className="flex-1 overflow-auto px-2 pb-2">{children}</div>
    </div>
  );
}
