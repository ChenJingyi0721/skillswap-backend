"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-accent-400/10">
      <SignUp afterSignUpUrl="/dashboard" />
    </div>
  );
}
