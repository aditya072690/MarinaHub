import { CalendarCheck, Search, Ship } from "lucide-react";
import { Fragment } from "react";

const STEPS = [
  {
    icon: Search,
    title: "Browse & compare",
    description: "Search boats by location, type, and price across local marinas.",
  },
  {
    icon: CalendarCheck,
    title: "Book online",
    description: "Pick your date, choose a boat, and confirm instantly — no phone tag.",
  },
  {
    icon: Ship,
    title: "Show up & go",
    description: "Check in at the marina with your digital ticket and hit the water.",
  },
];

export function HowItWorks() {
  return (
    <section
      className="hiw-section bg-[var(--hiw-bg)]"
      style={{
        padding: "clamp(4rem, 10vh, 6rem) clamp(1.25rem, 4vw, 3rem)",
      }}
    >
      <div className="landing-container">
        <header className="hiw-header">
          <span
            className="hiw-eyebrow"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            The Process
          </span>
          <h2
            className="hiw-title text-[clamp(1.8rem,3.5vw,2.4rem)] font-bold tracking-[-0.025em] text-[var(--hiw-headline)]"
            style={{ fontFamily: "var(--font-sora), sans-serif" }}
          >
            How it works
          </h2>
          <div
            className="hiw-wave-rule wave-rule"
            aria-hidden="true"
          />
          <p
            className="hiw-subtitle text-[1rem] text-[var(--hiw-subtext)]"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Three steps to your next lake day
          </p>
        </header>

        <div className="hiw-steps-row">
          {STEPS.map((step, i) => (
            <Fragment key={step.title}>
              <div className="hiw-step">
                <div className="hiw-icon-container">
                  <div className="hiw-icon-wrap">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <span className="hiw-step-badge" aria-hidden="true">
                    {i + 1}
                  </span>
                </div>
                <span
                  className="hiw-step-label"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Step {i + 1}
                </span>
                <h3
                  className="hiw-step-title"
                  style={{ fontFamily: "var(--font-sora), sans-serif" }}
                >
                  {step.title}
                </h3>
                <p
                  className="hiw-step-desc"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {step.description}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hiw-connector" aria-hidden="true">
                  <div className="hiw-connector-track">
                    <div className="hiw-connector-fill" />
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
