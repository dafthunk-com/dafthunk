import { Globe } from "lucide-react";
import { Link } from "react-router";

export function HomeFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Logo and Copyright */}
          <div className="flex flex-col items-center md:items-start">
            <Link to="/" className="flex items-center gap-2 mb-2">
              <Globe className="h-7 w-7 text-primary" />{" "}
              {/* Placeholder Icon */}
              <span className="text-xl font-bold">Dafthunk</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} Dafthunk. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Workflow execution, simplified.
            </p>
          </div>

          {/* Navigation Links - Column 1 */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold mb-3">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/workflows/playground"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Playground
                </Link>
              </li>
              <li>
                <Link
                  to="/docs"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  to="/#features"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Links - Column 2 */}
          <div className="text-center md:text-left">
            <h3 className="font-semibold mb-3">Company</h3>
            <ul className="space-y-2">
              <li>
                {/* These are placeholders, update with actual links */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/heigvd-software-engineering/workflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
