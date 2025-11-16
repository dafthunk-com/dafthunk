import BookOpen from "lucide-react/icons/book-open";
import Bot from "lucide-react/icons/bot";
import Building from "lucide-react/icons/building";
import Github from "lucide-react/icons/github";
import Settings from "lucide-react/icons/settings";
import { Link } from "react-router";

import { OrganizationSwitcher } from "@/components/organization-switcher";
import { UserProfile } from "@/components/user-profile";

import { AppHeaderBreadcrumb } from "./app-header-breadcrumb";
import { useAuth } from "./auth-context";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  const { isAuthenticated } = useAuth();

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
        {isAuthenticated && <OrganizationSwitcher />}
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
              >
                <Settings className="h-4 w-4 mr-1.5" />
                <span>Settings</span>
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
