import { useEffect, useState } from "react";
import { LuCircleHelp } from "react-icons/lu";
import { Popover as PopoverPrimitive } from "radix-ui";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function InfoTip({ label, className }: { label: string; className?: string }) {
  const [prefersTap, setPrefersTap] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setPrefersTap(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const trigger = (
    <button
      type="button"
      aria-label={label}
      aria-expanded={prefersTap ? open : undefined}
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/84 text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--ink)] focus-visible:border-[color:var(--accent-strong)] focus-visible:outline-none",
        className,
      )}
    >
      <LuCircleHelp className="size-3.5" />
    </button>
  );

  const contentClassName =
    "z-50 max-w-[18rem] rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] px-3 py-2 text-left text-[0.8125rem] leading-6 text-[color:var(--ink-soft)] [overflow-wrap:anywhere] shadow-[0_1rem_2.5rem_rgba(15,23,42,0.08)]";

  if (prefersTap) {
    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="top"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className={contentClassName}
          >
            {label}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="top" align="end" sideOffset={8} className={contentClassName}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
