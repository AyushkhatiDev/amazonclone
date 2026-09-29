"use client";

import { create } from "zustand";
import type { Snap } from "./store";

type UI = {
  added: { item: Snap; qty: number } | null;
  showAdded: (item: Snap, qty: number) => void;
  closeAdded: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
};

export const useUI = create<UI>((set) => ({
  added: null,
  showAdded: (item, qty) => set({ added: { item, qty } }),
  closeAdded: () => set({ added: null }),
  toast: null,
  showToast: (toast) => {
    set({ toast });
    setTimeout(() => set((s) => (s.toast === toast ? { toast: null } : s)), 2600);
  },
}));
