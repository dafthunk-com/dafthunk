import BookOpen from "lucide-react/icons/book-open";
import Code from "lucide-react/icons/code";
import Sparkles from "lucide-react/icons/sparkles";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { Toaster } from "sonner";

import { AppHeader } from "@/components/app-header";
import { PageProvider } from "@/components/page-context";
import type { DocsSection } from "@/components/sidebar/docs-nav-main";
import { DocsSidebar } from "@/components/sidebar/docs-sidebar";
import * as Sidebar from "@/components/ui/sidebar";

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
      { title: "Explore Nodes", href: "#explore-nodes" },
      { title: "Anatomy of a Node", href: "#node-anatomy" },
      { title: "Node Categories", href: "#node-categories" },
      { title: "Connecting Nodes", href: "#connecting-nodes" },
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
    <PageProvider>
      <div className="flex h-screen w-screen overflow-hidden flex-col">
        <AppHeader />
        <Toaster />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar.SidebarProvider>
            <DocsSidebar sections={docsSections} />
            <Sidebar.SidebarInset>
              <div
                className="h-full w-full overflow-y-auto"
                data-docs-main-content
              >
                <div className="max-w-5xl mx-auto py-10 px-6">{children}</div>
              </div>
            </Sidebar.SidebarInset>
          </Sidebar.SidebarProvider>
        </div>
      </div>
    </PageProvider>
  );
}
