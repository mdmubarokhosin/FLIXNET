"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { UserProfile } from "@/firebase/types";
import {
  loginAdmin,
  logoutUser,
  resetPassword,
  updateUserProfile,
  changeUserPassword,
  onAuthChange,
  refreshUserProfile,
} from "@/services/authService";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  updateProfile: (displayName: string, photoURL?: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// Safe default for SSR
const defaultContext: AuthContextValue = {
  user: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
  sendReset: async () => {},
  updateProfile: async () => {},
  updatePassword: async () => {},
  refresh: async () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange((profile) => {
      setUser(profile);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const profile = await loginAdmin(email, password);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const sendReset = useCallback(async (email: string) => {
    await resetPassword(email);
  }, []);

  const updateProfile = useCallback(async (displayName: string, photoURL?: string) => {
    await updateUserProfile(displayName, photoURL);
    setUser((prev) => (prev ? { ...prev, displayName, photoURL: photoURL || prev.photoURL } : prev));
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    await changeUserPassword(password);
  }, []);

  const refresh = useCallback(async () => {
    const profile = await refreshUserProfile();
    if (profile) setUser(profile);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === "admin",
        login,
        logout,
        sendReset,
        updateProfile,
        updatePassword,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Eagerly initialize Firebase Auth
import { auth } from "@/firebase/config";
void auth;

export function useAuth() {
  return useContext(AuthContext);
}
