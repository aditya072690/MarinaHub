"use client";

import {
  signInConsumer,
  signInMarina,
  signInWithGoogle,
  signUpConsumer,
  signUpMarina,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import type { AuthIntent } from "@/lib/auth/intent";
import { Anchor, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const COPY = {
  consumer: {
    loginTitle: "Welcome back",
    loginDescription: "Sign in to manage your trips and favorites",
    signupTitle: "Create your account",
    signupDescription: "Track bookings, save favorites, and book faster",
    signupSuccess: "Account created! Check your email to confirm, then sign in.",
  },
  marina: {
    loginTitle: "Marina sign in",
    loginDescription: "Access your marina dashboard",
    signupTitle: "Create marina account",
    signupDescription: "Set up your marina and start managing bookings",
    signupSuccess: "Account created! Check your email to confirm, then sign in.",
  },
} as const;

export function UnifiedAuthForm({
  mode = "login",
  defaultIntent = "consumer",
}: {
  mode?: "login" | "signup";
  defaultIntent?: AuthIntent;
}) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignup = mode === "signup";
  const intentParam = searchParams.get("intent") as AuthIntent | null;
  const [persona, setPersona] = useState<AuthIntent>(
    intentParam === "marina" || intentParam === "consumer" ? intentParam : defaultIntent
  );
  const copy = COPY[persona];
  const redirect = searchParams.get("redirect") ?? "";
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");

  function buildFormData(): FormData {
    const formData = new FormData();
    formData.set("email", email.trim());
    formData.set("password", password);
    if (isSignup && fullName.trim()) {
      formData.set("full_name", fullName.trim());
    }
    if (redirect) {
      formData.set("redirect", redirect);
    }
    return formData;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = buildFormData();
    const result = isSignup
      ? persona === "consumer"
        ? await signUpConsumer(formData)
        : await signUpMarina(formData)
      : persona === "consumer"
        ? await signInConsumer(formData)
        : await signInMarina(formData);

    if (!result?.success) {
      toast.error(result && !result.success ? result.error : "Something went wrong");
      setLoading(false);
      return;
    }

    if (isSignup) {
      toast.success(copy.signupSuccess);
    }

    router.push(result.data.redirectTo);
    router.refresh();
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const result = await signInWithGoogle(persona);
    if (!result.success) {
      toast.error(result.error);
      setGoogleLoading(false);
      return;
    }
    window.location.href = result.data.url;
  }

  const loginHref = redirect
    ? `/auth/login?intent=${persona}&redirect=${encodeURIComponent(redirect)}`
    : `/auth/login?intent=${persona}`;
  const signupHref = redirect
    ? `/auth/signup?intent=${persona}&redirect=${encodeURIComponent(redirect)}`
    : `/auth/signup?intent=${persona}`;

  return (
    <div className="auth-card">
      <div className="auth-icon-wrap">
        <Anchor />
      </div>
      {isSignup && (
        <p
          className="auth-eyebrow"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Join MarinaHub
        </p>
      )}
      <h1
        className="auth-title"
        style={{ fontFamily: "var(--font-sora), sans-serif" }}
      >
        {isSignup ? copy.signupTitle : copy.loginTitle}
      </h1>
      <p
        className="auth-subtitle"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {isSignup ? copy.signupDescription : copy.loginDescription}
      </p>
      <div className="auth-wave-rule" aria-hidden="true" />

      <div className="auth-toggle">
        <button
          type="button"
          className="auth-toggle-btn"
          data-active={persona === "consumer"}
          onClick={() => setPersona("consumer")}
        >
          Customer
        </button>
        <button
          type="button"
          className="auth-toggle-btn"
          data-active={persona === "marina"}
          onClick={() => setPersona("marina")}
        >
          Marina
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-fields">
          {isSignup && (
            <div className="auth-field">
              <label htmlFor="full_name" className="auth-label">
                Full Name
              </label>
              <Input
                id="full_name"
                className="auth-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <Input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="password" className="auth-label">
                Password
              </label>
              {!isSignup && (
                <Link href="/auth/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput
              id="password"
              className="auth-input"
              wrapperClassName="auth-input-wrap"
              toggleClassName="auth-pw-toggle"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              placeholder={isSignup ? "At least 12 characters" : undefined}
            />
          </div>
        </div>
        <button
          type="submit"
          className="auth-submit-btn"
          disabled={loading || googleLoading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSignup ? "Sign Up" : "Sign In"}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="auth-divider">
            <span>Or</span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="auth-google-btn"
            disabled={loading || googleLoading}
            onClick={handleGoogle}
          >
            {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with Google
          </Button>
        </>
      )}

      <div className="auth-footer">
        <p className="auth-footer-text">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href={loginHref}>Sign in</Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <Link href={signupHref}>Sign up</Link>
            </>
          )}
        </p>
        <Link href="/login" className="auth-switch-link">
          Switch account type
        </Link>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.set("email", email.trim());
    const { forgotPassword } = await import("@/actions/auth");
    const result = await forgotPassword(formData);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSent(true);
    toast.success(result.data.message);
  }

  if (sent) {
    return (
      <div className="auth-card">
        <div className="auth-icon-wrap">
          <Anchor />
        </div>
        <h1
          className="auth-title"
          style={{ fontFamily: "var(--font-sora), sans-serif" }}
        >
          Check your email
        </h1>
        <p
          className="auth-subtitle"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          If an account exists for {email}, we sent a password reset link.
        </p>
        <div className="auth-wave-rule" aria-hidden="true" />
        <Link href="/auth/login" className="auth-submit-btn mt-2 text-center no-underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-icon-wrap">
        <Anchor />
      </div>
      <h1
        className="auth-title"
        style={{ fontFamily: "var(--font-sora), sans-serif" }}
      >
        Reset password
      </h1>
      <p
        className="auth-subtitle"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        Enter your email and we&apos;ll send you a reset link
      </p>
      <div className="auth-wave-rule" aria-hidden="true" />
      <form onSubmit={handleSubmit}>
        <div className="auth-fields">
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">
              Email
            </label>
            <Input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </button>
      </form>
      <p className="auth-footer-text">
        <Link href="/auth/login">Back to sign in</Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.set("password", password);
    const { resetPassword } = await import("@/actions/auth");
    const result = await resetPassword(formData);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Password updated");
    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="auth-icon-wrap">
        <Anchor />
      </div>
      <h1
        className="auth-title"
        style={{ fontFamily: "var(--font-sora), sans-serif" }}
      >
        Set new password
      </h1>
      <p
        className="auth-subtitle"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        Choose a strong password for your account
      </p>
      <div className="auth-wave-rule" aria-hidden="true" />
      <form onSubmit={handleSubmit}>
        <div className="auth-fields">
          <div className="auth-field">
            <label htmlFor="password" className="auth-label">
              New password
            </label>
            <PasswordInput
              id="password"
              className="auth-input"
              wrapperClassName="auth-input-wrap"
              toggleClassName="auth-pw-toggle"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
            />
          </div>
        </div>
        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  );
}
