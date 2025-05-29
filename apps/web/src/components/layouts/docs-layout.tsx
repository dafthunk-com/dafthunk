import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Code,
  Menu,
  Sparkles,
  Workflow,
} from "lucide-react";
import React from "react";
import { Link, useLocation } from "react-router";

import { MdxProvider } from "@/components/mdx-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/utils/utils";

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

export interface DocsNavigation {
  previous?: {
    title: string;
    href: string;
  };
  next?: {
    title: string;
    href: string;
  };
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

interface DocsLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  badge?: string;
  navigation?: DocsNavigation;
  tableOfContents?: TableOfContentsItem[];
}

const docsSections: DocsSection[] = [
  {
    title: "Overview",
    href: "/docs/overview",
    icon: BookOpen,
    badge: "Start here",
  },
  {
    title: "Workflows",
    href: "/docs/workflows",
    icon: Workflow,
    subsections: [
      { title: "Getting Started", href: "#getting-started" },
      { title: "Workflow Types", href: "#workflow-types" },
      {
        title: "Testing & Deployment",
        href: "#testing-deployment",
      },
    ],
  },
  {
    title: "Nodes Reference",
    href: "/docs/nodes",
    icon: Sparkles,
    badge: "70+ nodes",
    subsections: [
      { title: "AI & Language Models", href: "#ai-language" },
      { title: "Image Processing", href: "#image-processing" },
      { title: "Web & HTTP", href: "#web-http" },
      { title: "Data Processing", href: "#data-processing" },
    ],
  },
  {
    title: "API Reference",
    href: "/docs/api",
    icon: Code,
    subsections: [
      { title: "Authentication", href: "#authentication" },
      { title: "Workflow Execution", href: "#workflow-execution" },
      { title: "Status & Results", href: "#status-results" },
    ],
  },
];

function DocsSidebar() {
  const location = useLocation();

  return (
    <div className="w-72 border-r bg-muted/40 h-screen fixed left-0 top-0 z-30">
      <div className="p-6 border-b">
        <Link to="/docs" className="flex items-center gap-2">
          <BookOpen className="size-5" />
          <span className="font-semibold">Documentation</span>
          <Badge variant="secondary" className="ml-auto">
            v1.0
          </Badge>
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 space-y-2">
          {docsSections.map((section) => (
            <div key={section.href} className="space-y-1">
              <Link
                to={section.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent",
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

function TableOfContents({ items }: { items: TableOfContentsItem[] }) {
  if (!items.length) return null;

  return (
    <div className="w-56 shrink-0">
      <div className="sticky top-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">On this page</h4>
          <div className="space-y-1">
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "block text-xs text-muted-foreground hover:text-foreground transition-colors",
                  item.level === 2 && "pl-0",
                  item.level === 3 && "pl-3",
                  item.level === 4 && "pl-6"
                )}
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavigationButtons({ navigation }: { navigation?: DocsNavigation }) {
  if (!navigation?.previous && !navigation?.next) return null;

  return (
    <div className="flex justify-between items-center pt-8 border-t">
      {navigation.previous ? (
        <Button variant="outline" asChild>
          <Link
            to={navigation.previous.href}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="size-4" />
            <div className="text-left">
              <div className="text-xs text-muted-foreground">Previous</div>
              <div>{navigation.previous.title}</div>
            </div>
          </Link>
        </Button>
      ) : (
        <div />
      )}
      {navigation.next && (
        <Button variant="outline" asChild>
          <Link to={navigation.next.href} className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Next</div>
              <div>{navigation.next.title}</div>
            </div>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export function DocsLayout({
  children,
  title,
  description,
  badge,
  navigation,
  tableOfContents = [],
}: DocsLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <DocsSidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-40"
            >
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <DocsSidebar />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex md:ml-72">
        <main className="flex-1 max-w-4xl">
          <div className="container mx-auto py-10 px-6">
            {/* Header */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
                {badge && <Badge variant="secondary">{badge}</Badge>}
              </div>
              {description && (
                <p className="text-lg text-muted-foreground max-w-3xl">
                  {description}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <MdxProvider>{children}</MdxProvider>
            </div>

            {/* Navigation */}
            <NavigationButtons navigation={navigation} />
          </div>
        </main>

        {/* Table of Contents */}
        <aside className="hidden xl:block">
          <div className="sticky top-6 p-6">
            <TableOfContents items={tableOfContents} />
          </div>
        </aside>
      </div>
    </div>
  );
}
