import { useMemo } from "react";
import { Link, useLocation } from "react-router";

import { cn } from "@/utils/utils";

interface NavLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
  activeClassName?: string;
  isActive?: (pathname: string) => boolean;
  end?: boolean;
}

export function NavLink({
  children,
  className,
  activeClassName,
  isActive: isActiveCustom,
  end,
  ...props
}: NavLinkProps) {
  const { pathname } = useLocation();

  const isActive = useMemo(() => {
    if (isActiveCustom) {
      return isActiveCustom(pathname);
    }
    const to = props.to.toString();
    if (end) {
      return pathname === to;
    }
    return pathname.startsWith(to);
  }, [isActiveCustom, props.to, pathname, end]);

  return (
    <Link className={cn(className, isActive && activeClassName)} {...props}>
      {children}
    </Link>
  );
}
