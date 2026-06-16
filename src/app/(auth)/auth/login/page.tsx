import {
  ForgotPasswordForm,
  ResetPasswordForm,
  UnifiedAuthForm,
} from "@/components/auth/unified-auth-form";
import { Suspense } from "react";

export default function AuthLoginPage() {
  return (
    <Suspense fallback={<div className="auth-card h-96 animate-pulse" />}>
      <UnifiedAuthForm mode="login" />
    </Suspense>
  );
}
