"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Settings } from "@/firebase/types";
import { fetchSettings, saveSettings as saveSettingsSvc } from "@/services/dataService";
import { defaultSettings } from "@/firebase/seed";

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  update: (s: Partial<Settings>) => Promise<void>;
}

// Safe default for SSR
const defaultContext: SettingsContextValue = {
  settings: defaultSettings,
  loading: true,
  update: async () => {},
};

const SettingsContext = createContext<SettingsContextValue>(defaultContext);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await fetchSettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Apply theme colors as CSS variables
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--flix-primary", settings.primaryColor);
    root.style.setProperty("--flix-bg", settings.backgroundColor);
    document.title = settings.seoTitle || defaultSettings.seoTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", settings.seoDescription);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", settings.seoKeywords);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", settings.seoTitle);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute("content", settings.seoDescription);
  }, [settings]);

  const update = useCallback(async (s: Partial<Settings>) => {
    const updated = await saveSettingsSvc(s);
    setSettings(updated);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
