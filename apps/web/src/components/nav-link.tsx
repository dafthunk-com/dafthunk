import { cn } from "@/utils/utils";
import { Link } from "react-router-dom";

interface NavLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
  activeClassName?: string;
}

export function NavLink({
  children,
  className,
  activeClassName,
  ...props
}: NavLinkProps) {
  function isActive() {
    return window.location.pathname.startsWith(props.to.toString());
  }

  return (
    <Link className={cn(className, isActive() && activeClassName)} {...props}>
      {children}
    </Link>
  );
}
