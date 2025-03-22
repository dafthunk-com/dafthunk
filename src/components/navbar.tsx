import { Link } from "react-router-dom";
import { UserProfile } from "./user-profile";
import { cn } from "@/lib/utils";
import { Github } from "lucide-react";

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
          <img src="/logo.svg" alt="Workflow" className="h-10" />
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link 
          to="https://github.com/dafthunk-com/dafthunk" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-foreground hover:text-foreground/80 transition-colors"
          aria-label="GitHub Repository"
        >
          <Github className="h-5 w-5" />
        </Link>
        <UserProfile />
      </div>
    </nav>
  );
}
