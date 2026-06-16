import Link from "next/link";
import { getSessionContext } from "@/lib/auth/session";

export async function LandingCta() {
  const session = await getSessionContext();

  return (
    <section
      className="cta-section bg-[var(--cta-bg)]"
      style={{
        padding: "clamp(4rem, 10vh, 6rem) clamp(1.25rem, 4vw, 3rem)",
      }}
    >
      <div className="cta-grid">
        <div className="cta-consumer">
          <svg
            aria-hidden="true"
            className="cta-wave-deco"
            viewBox="0 0 200 120"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              d="M0,60 C40,20 80,100 120,60 C160,20 180,80 200,60 L200,120 L0,120 Z"
              fill="rgba(26,157,196,0.08)"
            />
            <path
              d="M0,80 C50,40 100,110 150,70 C175,50 190,90 200,80 L200,120 L0,120 Z"
              fill="rgba(26,157,196,0.05)"
            />
          </svg>
          <div className="cta-card-content">
            <span
              className="cta-eyebrow cta-eyebrow-light"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              For renters
            </span>
            <h3
              className="cta-title cta-title-light"
              style={{ fontFamily: "var(--font-sora), sans-serif" }}
            >
              Explore boats near you
            </h3>
            <p
              className="cta-subtitle cta-subtitle-light"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Find pontoons, fishing boats, and cruisers available this weekend.
            </p>
            <Link href="/search" className="cta-btn-ghost">
              Search boats
              <span className="cta-btn-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>

        <div className="cta-owner">
          <svg
            aria-hidden="true"
            className="cta-anchor-deco"
            viewBox="0 0 80 80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M40 8 C40 8 40 8 40 8 M40 12 C35 12 31 16 31 21 C31 25 33 28 37 30 L37 58 C33 57 29 54 27 50 L32 50 L24 42 L16 50 L21 50 C24 57 31 62 40 63 C49 62 56 57 59 50 L64 50 L56 42 L48 50 L53 50 C51 54 47 57 43 58 L43 30 C47 28 49 25 49 21 C49 16 45 12 40 12 Z M40 16 C43 16 45 18 45 21 C45 24 43 26 40 26 C37 26 35 24 35 21 C35 18 37 16 40 16 Z"
              fill="rgba(11,31,58,0.05)"
              stroke="none"
            />
          </svg>
          <div className="cta-card-content">
            <span
              className="cta-eyebrow cta-eyebrow-dark"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              For marina owners
            </span>
            <h3
              className="cta-title cta-title-dark"
              style={{ fontFamily: "var(--font-sora), sans-serif" }}
            >
              Grow your marina with MarinaHub
            </h3>
            <p
              className="cta-subtitle cta-subtitle-dark"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              Fleet management, online bookings, analytics, and an embeddable widget — all in one
              platform.
            </p>
            <div className="cta-btn-row">
              {session ? (
                session.memberships.length > 0 ? (
                  <Link href="/dashboard" className="cta-btn-solid">
                    Go to dashboard
                  </Link>
                ) : (
                  <Link href="/marina/signup" className="cta-btn-solid">
                    List your marina
                  </Link>
                )
              ) : (
                <>
                  <Link href="/marina/signup" className="cta-btn-solid">
                    Get started free
                  </Link>
                  <Link href="/login" className="cta-signin-link">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
