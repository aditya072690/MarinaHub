import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export function DashPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="dash-page-header-row">
      <div className="dash-page-header">
        <h1 className="dash-page-title">{title}</h1>
        {description ? <p className="dash-page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="dash-page-actions">{actions}</div> : null}
    </div>
  );
}

export function DashSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("dash-section", className)}>
      <div className="dash-section-header">
        <h2 className="dash-section-title">{title}</h2>
        {description ? (
          <p className="dash-section-description">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DashCard({
  className,
  hover = true,
  children,
  ...props
}: ComponentProps<"div"> & { hover?: boolean }) {
  return (
    <div
      className={cn("dash-card", hover && "dash-card-hover", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DashCardHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("dash-card-header", className)} {...props} />;
}

export function DashCardTitle({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("dash-card-title", className)} {...props} />;
}

export function DashCardContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("dash-card-content", className)} {...props} />;
}
