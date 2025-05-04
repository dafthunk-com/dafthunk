import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "./page-context";

export function AppHeaderBreadcrumb() {
  const { breadcrumbs } = useBreadcrumbs();

  // Don't render if there are no breadcrumb items
  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="ml-4 hidden md:flex">
      <BreadcrumbList>
<<<<<<< HEAD
        {displayPathnames.map((value, index) => {
          const originalIndex = index + 1;
          const isLast = index === displayPathnames.length - 1;
          const to = `/${pathnames.slice(0, originalIndex + 1).join("/")}`;
          const displayValue = decodeURIComponent(value)
            .replace(/\+/g, " ")
            .replace(/-/g, " ");

=======
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
>>>>>>> 67c57a5 (feat: refactor breadcrumb handling in app header and pages, integrating page context for improved navigation)
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {isLast || !item.to ? (
                  <BreadcrumbPage>
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <RouterLink to={item.to}>
                      {item.label}
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
