"use client";
import React from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PageTransition
 * --------------
 * Wraps page content with a Framer Motion entrance animation (fade + slide
 * up). Uses `useLocation()` as the AnimatePresence key so each route change
 * triggers a fresh entrance animation.
 *
 * Render once in MainLayout wrapping `<Outlet />`. The Outlet itself renders
 * the matched route's element.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
