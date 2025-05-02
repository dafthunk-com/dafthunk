import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export function AppHeaderBreadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Exclude the first path segment for the breadcrumb display
  const displayPathnames = pathnames.slice(1);

  return (
    <nav
      aria-label="breadcrumb"
      className="ml-4 flex items-center space-x-1 text-sm text-muted-foreground"
    >
      {displayPathnames.map((value, index) => {
        // Calculate the correct index in the original pathnames array
        const originalIndex = index + 1;
        const last = index === displayPathnames.length - 1;
        // Construct the full path for the link using the original pathnames
        const to = `/${pathnames.slice(0, originalIndex + 1).join("/")}`;
        // Decode URI component for display
        const displayValue = decodeURIComponent(value);

        return (
          <React.Fragment key={to}>
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {last ? (
              <span className="font-medium text-foreground capitalize">
                {displayValue}
              </span>
            ) : (
              <Link
                to={to}
                className="capitalize hover:text-foreground transition-colors"
              >
                {displayValue}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
