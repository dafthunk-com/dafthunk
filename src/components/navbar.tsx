import { Link } from "react-router-dom";
import { UserProfile } from "./user-profile";
import { cn } from "@/lib/utils";

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
          Workflow
        </Link>
      </div>
      <div className="flex items-center">
        <UserProfile />
      </div>
    </nav>
  );
}
