import { Link, useLocation } from "react-router-dom";
import { Bot, Settings } from "lucide-react";
import { UserProfile } from "@/components/user-profile";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";
import { AppHeaderBreadcrumb } from "./app-header-breadcrumb";
import { Logo } from "./logo";
import { useAuth } from "./authContext";

export function AppHeader() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 ps-5 pe-3">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <Logo />
        </Link>
        <AppHeaderBreadcrumb />
      </div>
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-2">
          {isAuthenticated && (
            <NavLink
              to="/dashboard"
              className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
              activeClassName="bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
            >
              Dashboard
            </NavLink>
          )}
          {isAuthenticated && (
            <NavLink
              to="/workflows/playground"
              isActive={() => location.pathname.startsWith("/workflows")}
              className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
              activeClassName="bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
            >
              Workflows
            </NavLink>
          )}
          <NavLink
            to="/docs"
            isActive={() => location.pathname.startsWith("/docs")}
            className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
            activeClassName="bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
          >
            Docs
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to="/settings/profile"
              isActive={() => location.pathname.startsWith("/settings")}
              className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
              activeClassName="bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50"
            >
              <Settings className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
            </NavLink>
          )}
        </nav>
        <ThemeToggle />
        <UserProfile />
      </div>
    </header>
  );
}
