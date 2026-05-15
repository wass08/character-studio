"use client";

import { create } from "zustand";
import { pb } from "./useConfiguratorStore";

const randomPassword = () =>
  `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}A1!`;

export const useAuthStore = create((set, get) => ({
  user: pb.authStore.record,
  isLoggedIn: pb.authStore.isValid,
  isAdmin: pb.authStore.record?.role === "admin",
  loginDialogOpen: false,
  setLoginDialogOpen: (open) => set({ loginDialogOpen: open }),

  // OTP state
  otpId: null,
  otpEmail: null,
  otpRequestPending: false,
  otpVerifyPending: false,

  requestOtp: async (email) => {
    if (get().otpRequestPending) return;
    set({ otpRequestPending: true });
    try {
      // Pre-create the user if missing (no signup endpoint with OTP-only).
      // Create is idempotent: ignore "email already in use".
      try {
        const password = randomPassword();
        await pb.collection("users").create({
          email,
          password,
          passwordConfirm: password,
        });
      } catch (e) {
        // 400 with "validation_invalid_email" or "validation_not_unique" → user exists, ignore.
        // Other errors fall through to requestOTP, which will reveal real problems.
      }
      const result = await pb.collection("users").requestOTP(email);
      set({ otpId: result.otpId, otpEmail: email });
      return result;
    } finally {
      set({ otpRequestPending: false });
    }
  },

  verifyOtp: async (code) => {
    const { otpId } = get();
    if (!otpId) throw new Error("No OTP request in flight");
    set({ otpVerifyPending: true });
    try {
      const result = await pb.collection("users").authWithOTP(otpId, code);
      set({
        otpId: null,
        otpEmail: null,
        loginDialogOpen: false,
        user: result.record,
        isLoggedIn: true,
        isAdmin: result.record?.role === "admin",
      });
      return result;
    } finally {
      set({ otpVerifyPending: false });
    }
  },

  resetOtp: () => set({ otpId: null, otpEmail: null }),

  logout: () => {
    pb.authStore.clear();
    set({ user: null, isLoggedIn: false, isAdmin: false });
  },
}));

if (typeof window !== "undefined") {
  pb.authStore.onChange(() => {
    useAuthStore.setState({
      user: pb.authStore.record,
      isLoggedIn: pb.authStore.isValid,
      isAdmin: pb.authStore.record?.role === "admin",
    });
  });
}
