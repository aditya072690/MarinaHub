import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Booked a pontoon for my family reunion in under five minutes. Easier than calling three marinas.",
    author: "Alex Rivera",
    role: "Weekend renter",
    rating: 5,
  },
  {
    quote:
      "The dashboard paid for itself the first month. Online bookings filled gaps in our slow weekdays.",
    author: "Sam Parker",
    role: "Marina owner, State Park Marina",
    rating: 5,
  },
  {
    quote:
      "Love saving favorite boats and seeing all my trips in one place. The QR ticket check-in was seamless.",
    author: "Jamie Chen",
    role: "Frequent renter",
    rating: 5,
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Testimonials() {
  return (
    <section
      className="t-section bg-[var(--t-bg)]"
      style={{
        padding: "clamp(4rem, 10vh, 6rem) clamp(1.25rem, 4vw, 3rem)",
      }}
    >
      <div className="landing-container">
        <header className="t-header">
          <span
            className="t-eyebrow"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            What people say
          </span>
          <h2
            className="t-title text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.025em] text-[var(--t-headline)]"
            style={{ fontFamily: "var(--font-sora), sans-serif" }}
          >
            Loved by renters and marina owners
          </h2>
          <div className="t-wave-rule" aria-hidden="true" />
        </header>

        <div className="t-carousel-outer">
          <div className="t-carousel-track">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="t-card">
                <div className="t-stars mb-[14px] flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote
                  className="t-quote"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {t.quote}
                </blockquote>
                <div className="t-divider" aria-hidden="true" />
                <div className="t-attribution">
                  <div
                    className="t-avatar"
                    aria-hidden="true"
                    style={{ fontFamily: "var(--font-sora), sans-serif" }}
                  >
                    {getInitials(t.author)}
                  </div>
                  <div className="t-attribution-text">
                    <p
                      className="t-name"
                      style={{ fontFamily: "var(--font-sora), sans-serif" }}
                    >
                      {t.author}
                    </p>
                    <p
                      className="t-role"
                      style={{ fontFamily: "var(--font-inter), sans-serif" }}
                    >
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="t-controls">
          <div className="t-dots">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.author}
                type="button"
                className="t-dot"
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
          <div className="t-progress-track" aria-hidden="true">
            <div className="t-progress-fill" />
          </div>
        </div>
      </div>
    </section>
  );
}
