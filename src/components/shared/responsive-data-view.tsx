import { cn } from "@/lib/utils";

export function MobileDataCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        onClick && "cursor-pointer transition-colors hover:bg-muted/30",
        className
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export function MobileDataField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium">{children}</span>
    </div>
  );
}

export function ResponsiveDataView({
  table,
  cards,
  className,
  mobileBreakpoint = "sm",
}: {
  table: React.ReactNode;
  cards: React.ReactNode;
  className?: string;
  mobileBreakpoint?: "sm" | "lg";
}) {
  const tableClass = mobileBreakpoint === "lg" ? "hidden lg:block" : "hidden sm:block";
  const cardsClass =
    mobileBreakpoint === "lg" ? "space-y-3 lg:hidden" : "space-y-3 sm:hidden";

  return (
    <div className={className}>
      <div className={tableClass}>{table}</div>
      <div className={cardsClass}>{cards}</div>
    </div>
  );
}
