import { Bot, Settings } from "lucide-react";
import { Link } from "react-router";

import { UserProfile } from "@/components/user-profile";

import { AppHeaderBreadcrumb } from "./app-header-breadcrumb";
import { useAuth } from "./auth-context";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  const { user, isAuthenticated } = useAuth();

  const navLinkClasses =
    "px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors";
  const activeNavLinkClasses =
    "bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 ps-5 pe-3">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
        </Link>
        <AppHeaderBreadcrumb />
      </div>
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                className={navLinkClasses}
                activeClassName={activeNavLinkClasses}
              >
                Dashboard
              </NavLink>
              {user?.developerMode && (
                <NavLink
                  to="/datasets"
                  className={navLinkClasses}
                  activeClassName={activeNavLinkClasses}
                >
                  Datasets
                </NavLink>
              )}
              <NavLink
                to="/workflows"
                className={navLinkClasses}
                activeClassName={activeNavLinkClasses}
              >
                Workflows
              </NavLink>
            </>
          ) : (
            <NavLink
              to="/login"
              isActive={(pathname) => pathname === "/login"}
              className={navLinkClasses}
              activeClassName={activeNavLinkClasses}
            >
              Login
            </NavLink>
          )}
          <NavLink
            to="/docs"
            className={navLinkClasses}
            activeClassName={activeNavLinkClasses}
          >
            Documentation
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to="/settings"
              className={navLinkClasses}
              activeClassName={activeNavLinkClasses}
            >
              <Settings className="h-5 w-5" />
            </NavLink>
          )}
        </nav>
        <ThemeToggle />
        <UserProfile />
      </div>
    </header>
  );
}
