import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { UserProfile } from "@/components/user-profile";
import { NavLink } from "./nav-link";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-3">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <span className="text-lg font-semibold">dafthunk</span>
        </Link>
      </div>
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-4">
          <NavLink
            to="/dashboard"
            className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 transition-colors"
            activeClassName="bg-neutral-300/50 text-neutral-900 hover:bg-neutral-300/50"
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/workflows/playground"
            className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 transition-colors"
            activeClassName="bg-neutral-300/50 text-neutral-900 hover:bg-neutral-300/50"
          >
            Workflows
          </NavLink>
          {/* <Link to="/agents" className="text-sm">
            Agents
          </Link> */}
          <NavLink
            to="/docs"
            className="px-2.5 py-1 text-sm rounded-md hover:bg-neutral-200/50 transition-colors"
            activeClassName="bg-neutral-300/50 text-neutral-900 hover:bg-neutral-300/50"
          >
            Docs
          </NavLink>
        </nav>
        <UserProfile />
      </div>
    </header>
  );
}
