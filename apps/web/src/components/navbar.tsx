import { Link } from "react-router-dom";
import { UserProfile } from "./user-profile";
import { cn } from "@/utils/utils";

interface NavBarProps {
  className?: string;
}

export function NavBar({ className }: NavBarProps) {
  return (
    <nav
      className={cn(
        "w-full h-14 flex items-center justify-between px-6 shrink-0",
        className
      )}
    >
      <div className="flex items-center">
        <Link to="/" className="text-xl font-semibold">
          <h2>dafthunk</h2>
        </Link>
      </div>
      <div className="flex items-center gap-8">
        <Link to="/">Dashboard</Link>
        <Link to="/docs">Docs</Link>
        <UserProfile />
      </div>
    </nav>
  );
}
