import * as React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function AppHeaderBreadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Exclude the root path segment if needed (e.g., /workflows/playground becomes Playground)
  const displayPathnames = pathnames.slice(1);

  // Don't render if there's nothing to display after slicing
  if (displayPathnames.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="ml-4 hidden md:flex">
      <BreadcrumbList>
        {displayPathnames.map((value, index) => {
          const originalIndex = index + 1;
          const isLast = index === displayPathnames.length - 1;
          const to = `/${pathnames.slice(0, originalIndex + 1).join("/")}`;
          const displayValue = decodeURIComponent(value)
            .replace(/\+/g, " ")
            .replace(/\-/g, " ");

          return (
            <React.Fragment key={to}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="capitalize">
                    {displayValue}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <RouterLink to={to} className="capitalize">
                      {displayValue}
                    </RouterLink>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
