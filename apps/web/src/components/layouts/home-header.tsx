import { ArrowUpRight, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";

export function HomeHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-md border-b"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Bot Icon */}
          <Link to="/" className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-foreground" />
          </Link>

          {/* Navigation Links and Sign In Button */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={scrollToFeatures}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </button>
              <Link
                to="/docs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Documentation
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Sign In Button */}
            <Button
              asChild
              size="sm"
              className="bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 text-white border-0"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
