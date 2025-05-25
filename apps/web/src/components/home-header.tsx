import { useEffect, useState } from "react";
import { Link } from "react-router";

import { cn } from "@/utils/utils";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export const HOME_HEADER_HEIGHT = 55;

export function HomeHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > HOME_HEADER_HEIGHT);
    };

    window.addEventListener("scroll", handleScroll);
    // Call handler once on mount to check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={cn(
        "w-full fixed top-0 z-50 transition-all",
        isScrolled && "backdrop-blur"
      )}
    >
      <header
        className="flex items-center justify-between container mx-auto py-2 px-4"
        style={{ height: HOME_HEADER_HEIGHT }}
      >
        <div className="flex items-center justify-between w-full">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>
    </div>
  );
}
