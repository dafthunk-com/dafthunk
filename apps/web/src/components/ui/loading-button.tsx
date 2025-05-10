import { cn } from "@/utils/utils";
import { Button, ButtonProps } from "./button";
import { Spinner } from "./spinner";

interface LoadingButtonProps extends ButtonProps {
  isLoading: boolean;
  icon?: React.ReactNode;
}

export function LoadingButton({
  children,
  isLoading,
  icon,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      className={cn(props.className, "flex items-center")}
      disabled={isLoading || props.disabled}
    >
      {isLoading ? <Spinner /> : icon}
      {children}
    </Button>
  );
}
