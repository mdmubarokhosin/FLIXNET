/**
 * FLIXNET Auth Service — Admin-Only Edition
 *
 * No user registration. No Google login. No subscription.
 * Only admin email/password login via Firebase Auth.
 * Admin email: contact.mdmubarok@gmail.com
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  updatePassword as fbUpdatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { UserProfile } from "@/firebase/types";

// Admin emails (case-insensitive) — these users get admin role automatically
const ADMIN_EMAILS = [
  "contact.mdmubarok@gmail.com",
  "admin@flixnet.com",
];

async function ensureUserDoc(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const email = user.email?.toLowerCase() || "";
  const isAdmin = ADMIN_EMAILS.includes(email);

  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Admin"),
      photoURL: user.photoURL,
      role: isAdmin ? "admin" : "user",
      banned: false,
      createdAt: Date.now(),
    };
    await setDoc(userRef, profile);
    return profile;
  }

  const existing = snap.data() as UserProfile;
  // Ensure role consistency for admin emails
  if (isAdmin && existing.role !== "admin") {
    await updateDoc(userRef, { role: "admin" });
    existing.role = "admin";
  }
  return { ...existing, uid: user.uid, email: user.email, photoURL: user.photoURL || existing.photoURL, displayName: user.displayName || existing.displayName };
}

/** Admin login — email/password only */
export async function loginAdmin(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserDoc(cred.user);
  if (profile.banned) {
    await signOut(auth);
    throw new Error("Your account has been banned.");
  }
  if (profile.role !== "admin") {
    // Allow login but warn — the admin route guard will handle access
  }
  return profile;
}

/** Create a new admin account (used during setup) */
export async function createAdminAccount(email: string, password: string, displayName: string): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  const profile = await ensureUserDoc(cred.user);
  return profile;
}

/** Create a user account (admin creates for other users) */
export async function createUserAccount(email: string, password: string, displayName: string): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  const profile = await ensureUserDoc(cred.user);
  // Sign out the created user immediately (Firebase limitation — we sign in as them during creation)
  await signOut(auth);
  return profile;
}

/** Logout */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/** Password reset */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/** Update current user profile */
export async function updateUserProfile(displayName: string, photoURL?: string): Promise<void> {
  if (!auth.currentUser) throw new Error("Not authenticated");
  await updateProfile(auth.currentUser, { displayName, ...(photoURL ? { photoURL } : {}) });
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    displayName,
    ...(photoURL ? { photoURL } : {}),
  });
}

/** Change password */
export async function changeUserPassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error("Not authenticated");
  await fbUpdatePassword(auth.currentUser, newPassword);
}

/** Refresh current user profile from Firestore */
export async function refreshUserProfile(): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  return ensureUserDoc(auth.currentUser);
}

/** Auth state listener */
export function onAuthChange(cb: (profile: UserProfile | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cb(null);
      return;
    }
    try {
      const profile = await ensureUserDoc(user);
      cb(profile);
    } catch {
      cb(null);
    }
  });
}
