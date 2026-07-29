import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-bold leading-none tracking-[0.04em] shadow-[inset_0_1px_0_hsl(var(--surface-highlight)/0.35)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/[0.09] text-primary hover:bg-primary/[0.13] dark:text-primary",
        secondary: "border-border/70 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/[0.14]",
        outline: "border-border/80 bg-card/55 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
