"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { useStore, useAccount, useHydrated, type Address } from "@/lib/store";
import AuthForm from "@/components/AuthForm";
import AddressForm from "@/components/AddressForm";

export default function AccountPage() {
  const hydrated = useHydrated();
  const account = useAccount();
  const { saveAddress, signOut } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  if (!hydrated) return <div className="h-96" />;

  if (!account) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card p-6">
          <h1 className="mb-5 text-xl font-bold">Sign in to your account</h1>
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hello, {account.name}</h1>
          <p className="text-sm text-muted">{account.email}</p>
        </div>
        <button
          onClick={() => {
            signOut();
            router.push("/");
          }}
          className="btn-secondary"
        >
          Sign out
        </button>
      </div>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Addresses</h2>
          {!editing && <button onClick={() => setEditing("new")} className="text-sm link">Add address</button>}
        </div>
        {editing ? (
          <div className="mt-4">
            <AddressForm
              initial={editing === "new" ? undefined : editing}
              defaultName={account.name}
              onSave={(a) => {
                saveAddress(a);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        ) : account.addresses.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No saved addresses yet. You can add one here or at checkout.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {account.addresses.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-4 text-sm">
                <p className="flex items-center gap-1.5 font-medium"><MapPin className="h-4 w-4 text-muted" /> {a.name}</p>
                <p className="mt-1 text-muted">{a.line1}{a.line2 && `, ${a.line2}`}, {a.city}, {a.state} {a.pincode}</p>
                <p className="text-muted">{a.phone}</p>
                <button onClick={() => setEditing(a)} className="mt-2 text-sm link">Edit</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-muted">
        Bazaar is a demo, so your account, orders and addresses are stored in this browser only. Clearing site data removes them.
      </p>
    </div>
  );
}
