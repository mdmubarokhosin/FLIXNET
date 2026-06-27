import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "@/lib/siteConfig";

// Re-export so existing imports keep working
export { firebaseConfig };

// Initialize Firebase (guard against double init in dev hot reloads)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);

// Firestore (replaces Realtime Database)
export const db = getFirestore(app);

// Firebase Storage
export const storage = getStorage(app);

export default app;
