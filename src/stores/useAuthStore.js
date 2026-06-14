"use client";

import { create } from "zustand";
import { needsUsernameSetup } from "@/lib/userDisplay";
import { pb, useConfiguratorStore } from "./useConfiguratorStore";

const randomPassword = () =>
  `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}A1!`;

export const useAuthStore = create((set, get) => ({
  user: pb.authStore.record,
  isLoggedIn: pb.authStore.isValid,
  isAdmin: pb.authStore.record?.role === "admin",
  loginDialogOpen: false,
  setLoginDialogOpen: (open) => set({ loginDialogOpen: open }),
  usernameDialogOpen:
    pb.authStore.isValid && needsUsernameSetup(pb.authStore.record),
  usernameUpdatePending: false,

  // OTP state
  otpId: null,
  otpEmail: null,
  otpRequestPending: false,
  otpVerifyPending: false,

  requestOtp: async (email) => {
    if (get().otpRequestPending) return;
    set({ otpRequestPending: true });
    try {
      const normalizedEmail = email.trim().toLowerCase();
      // Pre-create the user if missing (no signup endpoint with OTP-only).
      // Create is idempotent: ignore "email already in use".
      try {
        const password = randomPassword();
        await pb.collection("users").create({
          email: normalizedEmail,
          password,
          passwordConfirm: password,
        });
      } catch {
        // 400 with "validation_invalid_email" or "validation_not_unique" -> user exists, ignore.
      }
      const result = await pb.collection("users").requestOTP(normalizedEmail);
      set({ otpId: result.otpId, otpEmail: normalizedEmail });
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
      const record = result.record;
      set({
        otpId: null,
        otpEmail: null,
        loginDialogOpen: false,
        usernameDialogOpen: needsUsernameSetup(record),
        user: record,
        isLoggedIn: true,
        isAdmin: record?.role === "admin",
      });
      return { ...result, record };
    } finally {
      set({ otpVerifyPending: false });
    }
  },

  resetOtp: () => set({ otpId: null, otpEmail: null }),

  logout: () => {
    pb.authStore.clear();
    // Drop any cached character so the next visitor on this browser
    // doesn't land on the previous user's saved character (persisted to
    // the character-studio-prefs localStorage slice).
    useConfiguratorStore
      .getState()
      .setCurrentCharacter({ id: null, name: null });
    set({
      user: null,
      isLoggedIn: false,
      isAdmin: false,
      usernameDialogOpen: false,
      usernameUpdatePending: false,
    });
  },

  completeUsernameSetup: async (username) => {
    const { user, usernameUpdatePending } = get();
    if (!user?.id || usernameUpdatePending) return null;

    set({ usernameUpdatePending: true });
    try {
      const updated = await pb.collection("users").update(user.id, {
        username,
      });
      pb.authStore.save(pb.authStore.token, updated);
      set({
        user: updated,
        isLoggedIn: pb.authStore.isValid,
        isAdmin: updated?.role === "admin",
        usernameDialogOpen: false,
      });
      return updated;
    } finally {
      set({ usernameUpdatePending: false });
    }
  },
}));

const syncAuthState = () => {
  const record = pb.authStore.record;
  useAuthStore.setState({
    user: record,
    isLoggedIn: pb.authStore.isValid,
    isAdmin: record?.role === "admin",
    usernameDialogOpen: pb.authStore.isValid && needsUsernameSetup(record),
  });
};

if (typeof window !== "undefined") {
  pb.authStore.onChange(() => {
    syncAuthState();
  });

  queueMicrotask(() => {
    syncAuthState();
  });
}
