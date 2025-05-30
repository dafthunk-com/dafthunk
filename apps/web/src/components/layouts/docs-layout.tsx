import { BookOpen, Code, Sparkles } from "lucide-react";
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/utils";

import { AppLayout } from "./app-layout";

export interface DocsSection {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subsections?: {
    title: string;
    href: string;
  }[];
}

interface DocsLayoutProps {
  children: React.ReactNode;
}

const docsSections: DocsSection[] = [
  {
    title: "Core Concepts",
    href: "/docs/concepts",
    icon: BookOpen,
    subsections: [
      { title: "Workflows", href: "#workflows" },
      { title: "Nodes", href: "#nodes" },
      { title: "Deployments", href: "#deployments" },
      { title: "Executions", href: "#executions" },
      { title: "Organizations", href: "#organizations" },
      { title: "Practical Example", href: "#practical-example" },
    ],
  },
  {
    title: "Nodes Reference",
    href: "/docs/nodes",
    icon: Sparkles,
    subsections: [
      { title: "Anatomy of a Node", href: "#node-anatomy" },
      { title: "Node Categories", href: "#node-categories" },
      { title: "Connecting Nodes", href: "#connecting-nodes" },
      { title: "Node Library", href: "#node-browser" },
    ],
  },
  {
    title: "API Reference",
    href: "/docs/api",
    icon: Code,
    subsections: [
      { title: "Authentication", href: "#authentication" },
      { title: "Workflow Execution", href: "#workflow-execution" },
      { title: "Workflow Status", href: "#status-results" },
      { title: "Object Retrieval", href: "#object-retrieval" },
      { title: "Error Handling", href: "#error-handling" },
    ],
  },
  {
    title: "Developers Guide",
    href: "/docs/developers",
    icon: Code,
    subsections: [
      { title: "Getting Started", href: "#getting-started" },
      { title: "How to Contribute", href: "#how-to-contribute" },
      { title: "Technology Stack", href: "#technology-stack" },
    ],
  },
];

function DocsSidebar() {
  const location = useLocation();

  return (
    <div className="w-72 border-r h-[calc(100vh-4rem)]">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-2">
          {docsSections.map((section) => (
            <div key={section.href} className="space-y-1">
              <Link
                to={section.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent whitespace-nowrap",
                  location.pathname === section.href
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                <section.icon className="size-4" />
                {section.title}
                {section.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {section.badge}
                  </Badge>
                )}
              </Link>
              {section.subsections && location.pathname === section.href && (
                <div className="ml-6 space-y-1">
                  {section.subsections.map((subsection) => (
                    <a
                      key={subsection.href}
                      href={subsection.href}
                      className="block px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {subsection.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const location = useLocation();

  // Scroll to top when location changes
  useEffect(() => {
    // Find the main scroll container and scroll it to top
    const scrollContainer = document.querySelector("[data-docs-main-content]");
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    } else {
      // Fallback to window scroll
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto" data-docs-main-content>
          <div className="max-w-5xl mx-auto py-10 px-6">{children}</div>
        </main>
      </div>
    </AppLayout>
  );
}
