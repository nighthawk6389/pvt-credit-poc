import { cn } from "@/lib/utils";

/** A terminal-styled panel evoking a Bloomberg function screen. */
export function BloombergPanel({
  fn,
  title,
  children,
  className,
}: {
  fn: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-[color-mix(in_oklch,var(--warning)_8%,var(--card))] px-4 py-2.5">
        <span className="rounded bg-[var(--warning)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-black">
          {fn}
        </span>
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted-foreground ml-auto font-mono text-[10px]">
          BLOOMBERG · simulated
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
