import { cn } from "@/utils/utils";
import { Link } from "react-router-dom";

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
  function isActive() {
    if (isActiveCustom) {
      return isActiveCustom();
    }
    return window.location.pathname.startsWith(props.to.toString());
  }

  return (
    <Link className={cn(className, isActive() && activeClassName)} {...props}>
      {children}
    </Link>
  );
}
