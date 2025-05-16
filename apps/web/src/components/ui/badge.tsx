import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/utils/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        "translucent-success":
          "border-green-500/50 bg-green-500/20 text-green-700 dark:border-green-400/50 dark:bg-green-400/20 dark:text-green-300",
        "translucent-error":
          "border-red-500/50 bg-red-500/20 text-red-700 dark:border-red-400/50 dark:bg-red-400/20 dark:text-red-300",
        "translucent-inactive":
          "border-neutral-500/50 bg-neutral-500/10 text-neutral-600 dark:border-neutral-400/50 dark:bg-neutral-400/10 dark:text-neutral-400",
        "translucent-active":
          "border-blue-500/50 bg-blue-500/20 text-blue-700 dark:border-blue-400/50 dark:bg-blue-400/20 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
