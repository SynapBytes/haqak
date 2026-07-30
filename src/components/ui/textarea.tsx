import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[110px] w-full rounded-xl border border-input/80 bg-card/60 px-3.5 py-3 text-sm leading-7 text-foreground shadow-[inset_0_1px_0_hsl(var(--surface-highlight)/0.45)] ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/80 focus-visible:border-accent/[0.45] focus-visible:bg-card/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/[0.09] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
