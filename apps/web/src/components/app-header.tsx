import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { UserProfile } from "@/components/user-profile";

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
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-sm">
            Dashboard
          </Link>
          <Link to="/workflows/playground" className="text-sm">
            Workflows
          </Link>
          <Link to="/agents" className="text-sm">
            Agents
          </Link>
          <Link to="/docs" className="text-sm">
            Docs
          </Link>
        </nav>
        <UserProfile />
      </div>
    </header>
  );
}
