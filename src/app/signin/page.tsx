"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

function SignIn() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Welcome to Bazaar</h1>
        <p className="mb-6 text-sm text-muted">Sign in to check out, track orders and start returns.</p>
        <AuthForm onDone={() => router.push(next.startsWith("/") ? next : "/")} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
