import BookOpen from "lucide-react/icons/book-open";
import Bot from "lucide-react/icons/bot";
import Building from "lucide-react/icons/building";
import Github from "lucide-react/icons/github";
import Settings from "lucide-react/icons/settings";
import Shield from "lucide-react/icons/shield";
import { Link, useLocation } from "react-router";

import { OrganizationSwitcher } from "@/components/organization-switcher";
import { UserProfile } from "@/components/user-profile";

import { AppHeaderBreadcrumb } from "./app-header-breadcrumb";
import { useAuth } from "./auth-context";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isAdminSection = location.pathname.startsWith("/admin");
  const isSettingsSection = location.pathname.startsWith("/settings");
  const isDocsSection = location.pathname.startsWith("/docs");

  const navLinkClasses =
    "px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors flex items-center whitespace-nowrap";
  const activeNavLinkClasses =
    "bg-neutral-300/50 hover:bg-neutral-300/50 dark:bg-neutral-600/50 dark:hover:bg-neutral-600/50";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 ps-5 pe-3">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
        </Link>
        {isAuthenticated &&
          (isAdminSection ? (
            <span className="h-8 px-2 text-sm font-semibold flex items-center rounded-md bg-neutral-300/50 dark:bg-neutral-600/50">
              Administration
            </span>
          ) : isSettingsSection ? (
            <span className="h-8 px-2 text-sm font-semibold flex items-center rounded-md bg-neutral-300/50 dark:bg-neutral-600/50">
              Settings
            </span>
          ) : isDocsSection ? (
            <span className="h-8 px-2 text-sm font-semibold flex items-center rounded-md bg-neutral-300/50 dark:bg-neutral-600/50">
              Documentation
            </span>
          ) : (
            <OrganizationSwitcher />
          ))}
        <AppHeaderBreadcrumb />
      </div>
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <NavLink
                to={"/org"}
                className={navLinkClasses}
                activeClassName={activeNavLinkClasses}
              >
                <Building className="h-4 w-4 mr-1.5" />
                <span>Organization</span>
              </NavLink>
              <NavLink
                to={"/settings"}
                className={navLinkClasses}
                activeClassName={activeNavLinkClasses}
                data-tour="settings-link"
              >
                <Settings className="h-4 w-4 mr-1.5" />
                <span>Settings</span>
              </NavLink>
              {user?.role === "admin" && (
                <NavLink
                  to="/admin"
                  className={navLinkClasses}
                  activeClassName={activeNavLinkClasses}
                >
                  <Shield className="h-4 w-4 mr-1.5" />
                  <span>Administration</span>
                </NavLink>
              )}
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
            data-tour="documentation-link"
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            <span>Documentation</span>
          </NavLink>
          <a
            href="https://github.com/dafthunk-com/dafthunk"
            target="_blank"
            rel="noopener noreferrer"
            className={navLinkClasses}
          >
            <Github className="h-4 w-4 mr-1.5" />
            <span>GitHub</span>
          </a>
        </nav>
        <ThemeToggle />
        <UserProfile />
      </div>
    </header>
  );
}
