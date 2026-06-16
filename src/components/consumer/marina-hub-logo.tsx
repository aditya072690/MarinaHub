import Link from "next/link";

function AnchorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-1.2 7.8a1 1 0 0 0-.8 1v1.7H7.5a1 1 0 1 0 0 2h2.5v2.1a8 8 0 0 0-5.6 7.6 1 1 0 1 0 2 .1 6 6 0 0 1 11.2 0 1 1 0 1 0 2-.1 8 8 0 0 0-5.6-7.6v-2.1h2.5a1 1 0 1 0 0-2h-2.5v-1.7a1 1 0 0 0-.8-1Z" />
    </svg>
  );
}

export function MarinaHubLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
      style={{ fontFamily: "var(--font-sora), sans-serif" }}
    >
      <AnchorIcon className="h-5 w-5 shrink-0 text-[var(--nav-logo-mark)]" />
      <span className="text-base font-bold tracking-[-0.02em]">MarinaHub</span>
    </Link>
  );
}
