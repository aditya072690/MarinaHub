"use client";

import {
  signInConsumer,
  signInMarina,
  signUpConsumer,
  signUpMarina,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { AuthIntent } from "@/lib/auth/intent";
import { Anchor, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const DEMO_ACCOUNTS = {
  consumer: {
    email: "alex.rivera@demo.com",
    password: "DemoMarina2026!",
    label: "Alex Rivera (consumer)",
  },
  marina: {
    email: "owner@stateparkmarina.demo",
    password: "DemoMarina2026!",
    label: "Sam Parker (marina owner)",
  },
} as const;

const COPY = {
  consumer: {
    loginTitle: "Welcome back",
    loginDescription: "Sign in to manage your trips and favorites",
    signupTitle: "Create your account",
    signupDescription: "Track bookings, save favorites, and book faster",
    signupSuccess:
      "Account created! Check your email to confirm, then sign in.",
    loginLink: "/account/login",
    signupLink: "/account/signup",
    altPrompt: "Don't have an account?",
    altAction: "Sign up",
    reversePrompt: "Already have an account?",
    reverseAction: "Sign in",
  },
  marina: {
    loginTitle: "Marina sign in",
    loginDescription: "Access your marina dashboard",
    signupTitle: "Create marina account",
    signupDescription: "Set up your marina and start managing bookings",
    signupSuccess:
      "Account created! Check your email to confirm, then sign in.",
    loginLink: "/marina/login",
    signupLink: "/marina/signup",
    altPrompt: "New marina owner?",
    altAction: "Create account",
    reversePrompt: "Already have an account?",
    reverseAction: "Sign in",
  },
} as const;

export function LoginForm({
  mode = "login",
  persona = "marina",
  defaultEmail,
}: {
  mode?: "login" | "signup";
  persona?: AuthIntent;
  defaultEmail?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignup = mode === "signup";
  const copy = COPY[persona];
  const redirect = searchParams.get("redirect") ?? "";
  const emailFromQuery = searchParams.get("email") ?? defaultEmail ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(emailFromQuery);
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

    if (!result || !result.success) {
      toast.error(result && !result.success ? result.error : "Something went wrong");
      setLoading(false);
      return;
    }

    if (isSignup) {
      toast.success(copy.signupSuccess);
      if (result.data.redirectTo) {
        router.push(result.data.redirectTo);
        router.refresh();
      }
      setLoading(false);
      return;
    }

    router.push(result.data.redirectTo);
    router.refresh();
  }

  function fillDemoCredentials() {
    const demo = DEMO_ACCOUNTS[persona];
    setEmail(demo.email);
    setPassword(demo.password);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
          <Anchor className="h-6 w-6 text-sky-600" />
        </div>
        <CardTitle>
          {isSignup ? copy.signupTitle : copy.loginTitle}
        </CardTitle>
        <CardDescription>
          {isSignup ? copy.signupDescription : copy.loginDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSignup && process.env.NODE_ENV === "development" && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <p className="font-medium text-sky-900">Demo account</p>
            <p className="mt-1 text-sky-800">
              {DEMO_ACCOUNTS[persona].label}
              <br />
              <span className="font-mono text-xs">{DEMO_ACCOUNTS[persona].email}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={fillDemoCredentials}
            >
              Fill demo credentials
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              placeholder={isSignup ? "At least 12 characters" : undefined}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignup ? "Sign Up" : "Sign In"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? (
            <>
              {copy.reversePrompt}{" "}
              <Link
                href={
                  redirect
                    ? `${copy.loginLink}?redirect=${encodeURIComponent(redirect)}`
                    : copy.loginLink
                }
                className="text-sky-600 hover:underline"
              >
                {copy.reverseAction}
              </Link>
            </>
          ) : (
            <>
              {copy.altPrompt}{" "}
              <Link
                href={
                  redirect
                    ? `${copy.signupLink}?redirect=${encodeURIComponent(redirect)}`
                    : copy.signupLink
                }
                className="text-sky-600 hover:underline"
              >
                {copy.altAction}
              </Link>
            </>
          )}
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-sky-600 hover:underline">
            Switch account type
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
