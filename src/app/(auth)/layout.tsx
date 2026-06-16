import Link from "next/link";

function AuthLogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-1.2 7.8a1 1 0 0 0-.8 1v1.7H7.5a1 1 0 1 0 0 2h2.5v2.1a8 8 0 0 0-5.6 7.6 1 1 0 1 0 2 .1 6 6 0 0 1 11.2 0 1 1 0 1 0 2-.1 8 8 0 0 0-5.6-7.6v-2.1h2.5a1 1 0 1 0 0-2h-2.5v-1.7a1 1 0 0 0-.8-1Z" />
    </svg>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-deco-dots" aria-hidden="true" />
      <svg
        aria-hidden="true"
        className="auth-deco-wave"
        viewBox="0 0 600 60"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0,30 C100,0 200,60 300,30 C400,0 500,60 600,30"
          stroke="rgba(26,157,196,0.12)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0,40 C100,10 200,70 300,40 C400,10 500,70 600,40"
          stroke="rgba(26,157,196,0.07)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
      <Link href="/" className="auth-page-logo" aria-label="MarinaHub home">
        <AuthLogoIcon />
        <span>MarinaHub</span>
      </Link>
      {children}
    </div>
  );
}
