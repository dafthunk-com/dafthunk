import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { UserProfile } from "@/components/user-profile";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";
import { AppHeaderBreadcrumb } from "./app-header-breadcrumb";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 ps-5 pe-3">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <span className="text-lg font-semibold">dafthunk</span>
        </Link>
        <AppHeaderBreadcrumb />
      </div>
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-4">
          <NavLink
            to="/dashboard"
            className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
            activeClassName="bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/workflows/playground"
            isActive={() => window.location.pathname.startsWith("/workflows")}
            className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
            activeClassName="bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
          >
            Workflows
          </NavLink>
          <NavLink
            to="/docs"
            isActive={() => window.location.pathname.startsWith("/docs")}
            className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
            activeClassName="bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
          >
            Docs
          </NavLink>
        </nav>
        <ThemeToggle />
        <UserProfile />
      </div>
    </header>
  );
}
