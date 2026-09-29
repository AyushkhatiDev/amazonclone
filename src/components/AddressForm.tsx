"use client";

import { useState } from "react";
import type { Address } from "@/lib/store";

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export default function AddressForm({
  initial,
  defaultName = "",
  defaultPincode = "",
  onSave,
  onCancel,
}: {
  initial?: Address;
  defaultName?: string;
  defaultPincode?: string;
  onSave: (a: Address) => void;
  onCancel?: () => void;
}) {
  const [a, setA] = useState<Address>(
    () => initial ?? { id: "", name: defaultName, phone: "", line1: "", line2: "", city: "", state: "", pincode: defaultPincode },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setA({ ...a, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    if (a.name.trim().length < 2) err.name = "Enter the recipient's name";
    if (!/^[6-9]\d{9}$/.test(a.phone)) err.phone = "10-digit mobile number";
    if (!/^[1-8]\d{5}$/.test(a.pincode)) err.pincode = "6-digit pincode";
    if (a.line1.trim().length < 5) err.line1 = "House number and street";
    if (!a.city.trim()) err.city = "Required";
    if (!a.state) err.state = "Choose a state";
    setErrors(err);
    if (Object.keys(err).length === 0) onSave({ ...a, id: a.id || `addr-${Date.now().toString(36)}`, name: a.name.trim(), line1: a.line1.trim(), line2: a.line2.trim(), city: a.city.trim() });
  };

  const field = (k: keyof Address, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = "") => (
    <label className={`block text-sm ${span}`}>
      <span className="mb-1 block font-medium">{label}</span>
      <input className={`input ${errors[k] ? "border-alert" : ""}`} value={a[k]} onChange={set(k)} {...props} />
      {errors[k] && <span className="mt-1 block text-xs text-alert">{errors[k]}</span>}
    </label>
  );

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
      {field("name", "Full name", { autoComplete: "name" })}
      {field("phone", "Mobile number", { inputMode: "numeric", maxLength: 10, autoComplete: "tel-national" })}
      {field("line1", "Flat, house no., building, street", { autoComplete: "address-line1" }, "sm:col-span-2")}
      {field("line2", "Area, landmark (optional)", { autoComplete: "address-line2" }, "sm:col-span-2")}
      {field("pincode", "Pincode", { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" })}
      {field("city", "Town / city", { autoComplete: "address-level2" })}
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block font-medium">State</span>
        <select className={`input ${errors.state ? "border-alert" : ""}`} value={a.state} onChange={set("state")}>
          <option value="">Choose a state</option>
          {STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {errors.state && <span className="mt-1 block text-xs text-alert">{errors.state}</span>}
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary">Use this address</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
