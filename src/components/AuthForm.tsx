"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useStore, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/store";

export default function AuthForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp, signInDemo } = useStore();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "signup" && name.trim().length < 2) return setError("Tell us your name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Passwords need at least 6 characters.");
    setBusy(true);
    const err = mode === "signin" ? await signIn(email, password) : await signUp(name, email, password);
    setBusy(false);
    if (err) return setError(err);
    onDone?.();
  };

  const demo = async () => {
    setBusy(true);
    await signInDemo();
    setBusy(false);
    onDone?.();
  };

  return (
    <div>
      <button onClick={demo} disabled={busy} className="btn w-full border border-brand/30 bg-brand-soft py-3 text-brand-dark hover:border-brand">
        <Sparkles className="h-4 w-4" /> Continue with the demo account
      </button>
      <p className="mt-1.5 text-center text-xs text-muted">It comes with past orders, so you can try tracking and returns straight away.</p>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or use your own <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-full bg-page p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`rounded-full py-1.5 font-medium ${mode === m ? "bg-white shadow-sm" : "text-muted"}`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3" noValidate>
        {mode === "signup" && (
          <Field label="Your name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
        )}
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder={compact ? DEMO_EMAIL : undefined} />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "At least 6 characters" : undefined}>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-alert">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-3">
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        {mode === "signin" && (
          <p className="text-center text-xs text-muted">
            Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}
          </p>
        )}
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between font-medium">
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
