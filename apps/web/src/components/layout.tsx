import { ReactNode } from "react";
import { NavBar } from "./navbar";
import { Separator } from "@/components/ui/separator";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <NavBar />
      <Separator />
      {children}
    </div>
  );
}
