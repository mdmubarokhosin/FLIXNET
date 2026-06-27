"use client";

// SPA entry point — the entire app is client-side rendered via React Router.
// During SSR/prerendering, we render nothing to avoid React Router context errors.
// The client-side JavaScript takes over after hydration.

import { useEffect, useState } from "react";

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background, #0f0f0f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "var(--primary, #e50914)",
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          FLIX<span style={{ color: "var(--foreground, #fff)" }}>NET</span>
        </div>
      </div>
    );
  }

  // Dynamically import the App only on the client side
  // This prevents Next.js from analyzing the module graph during SSR
  const App = require("@/App").default;
  return <App />;
}
