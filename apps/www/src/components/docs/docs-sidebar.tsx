import { ChevronDown, Menu } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";

import { cn } from "../../lib/utils";

interface DocsAnchor {
  title: string;
  href: string;
}

interface DocsSection {
  title: string;
  href: string;
  anchors?: DocsAnchor[];
}

const docsSections: DocsSection[] = [
  {
    title: "Overview",
    href: "/docs",
  },
  {
    title: "Core Concepts",
    href: "/docs/concepts",
    anchors: [
      { title: "Workflows", href: "#workflows" },
      { title: "Nodes", href: "#nodes" },
      { title: "Executions", href: "#executions" },
      { title: "Triggers", href: "#triggers" },
      { title: "Resources", href: "#resources" },
      { title: "Organizations", href: "#organizations" },
      { title: "Practical Example", href: "#practical-example" },
    ],
  },
  {
    title: "Nodes Reference",
    href: "/docs/nodes",
    anchors: [
      { title: "Explore Nodes", href: "#explore-nodes" },
      { title: "Anatomy of a Node", href: "#node-anatomy" },
      { title: "Node Categories", href: "#node-categories" },
      { title: "Connecting Nodes", href: "#connecting-nodes" },
    ],
  },
  {
    title: "API Reference",
    href: "/docs/api",
    anchors: [
      { title: "Authentication", href: "#authentication" },
      { title: "Endpoint Execution", href: "#endpoint-execution" },
      { title: "Execution Status", href: "#status-results" },
      { title: "Object Retrieval", href: "#object-retrieval" },
      { title: "Queue Publishing", href: "#queue-publishing" },
      { title: "Database Query", href: "#database-query" },
      { title: "Error Handling", href: "#error-handling" },
    ],
  },
  {
    title: "Developers Guide",
    href: "/docs/developers",
    anchors: [
      { title: "Getting Started", href: "#getting-started" },
      { title: "How to Contribute", href: "#how-to-contribute" },
      { title: "Technology Stack", href: "#technology-stack" },
    ],
  },
];

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {docsSections.map((section) => {
        const isActive = pathname === section.href;
        return (
          <li key={section.href}>
            <a
              href={section.href}
              onClick={onNavigate}
              className={cn(
                "block px-3 py-1.5 text-sm rounded-md transition-colors",
                isActive
                  ? "text-gray-900 font-medium bg-gray-200/60"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/40"
              )}
            >
              {section.title}
            </a>
            {isActive && section.anchors && (
              <ul className="mt-1 ml-3 border-l border-gray-200 space-y-0.5">
                {section.anchors.map((anchor) => (
                  <li key={anchor.href}>
                    <a
                      href={anchor.href}
                      onClick={onNavigate}
                      className="block pl-3 pr-2 py-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {anchor.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DocsSidebar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeSection = docsSections.find((s) => s.href === pathname);

  return (
    <aside className="w-full lg:w-64 lg:shrink-0">
      {/* Mobile: collapsible menu */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="docs-mobile-nav"
          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 shadow-xs"
        >
          <span className="flex items-center gap-2">
            <Menu className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Documentation</span>
            {activeSection && (
              <span className="text-gray-500">· {activeSection.title}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              mobileOpen && "rotate-180"
            )}
          />
        </button>
        {mobileOpen && (
          <nav
            id="docs-mobile-nav"
            className="mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-xs"
          >
            <NavList
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>
        )}
      </div>

      {/* Desktop: sticky sidebar */}
      <nav className="hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4">
        <NavList pathname={pathname} />
      </nav>
    </aside>
  );
}
