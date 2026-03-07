"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-accent-400/10">
      <SignIn afterSignInUrl="/dashboard" />
    </div>
  );
}
