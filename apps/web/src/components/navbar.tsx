import { Link } from "react-router-dom";
import { UserProfile } from "./user-profile";
import { cn } from "@/utils/utils";
import { useAuth } from "@/components/authContext";
import { Button } from "@/components/ui/button";
interface NavBarProps {
  className?: string;
}

export function NavBar({ className }: NavBarProps) {
  const { isAuthenticated } = useAuth();

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
        {isAuthenticated && (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/workflows">Workflows</Link>
          </>
        )}
        <Link to="/docs">Docs</Link>
        
        {isAuthenticated &&  <UserProfile />}

        {!isAuthenticated && <Link to="/">Login</Link> }
      </div>
    </nav>
  );
}
