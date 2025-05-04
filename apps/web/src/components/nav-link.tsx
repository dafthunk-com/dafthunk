import { cn } from "@/utils/utils";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
  activeClassName?: string;
  isActive?: () => boolean;
}

export function NavLink({
  children,
  className,
  activeClassName,
  isActive: isActiveCustom,
  ...props
}: NavLinkProps) {
  const { pathname } = useLocation();

  const isActive = useMemo(() => {
    if (isActiveCustom) {
      return isActiveCustom();
    }
    return pathname.startsWith(props.to.toString());
  }, [isActiveCustom, props.to, pathname]);

  return (
    <Link className={cn(className, isActive && activeClassName)} {...props}>
      {children}
    </Link>
  );
}
