"use client";
import React, { Suspense, useEffect, useState } from "react";
import { HashRouter, MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SettingsProvider } from "@/context/SettingsContext";
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ScrollToTop from "@/components/shared/ScrollToTop";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { useServiceWorker } from "@/hooks/useServiceWorker";

// All page components loaded client-side only via next/dynamic with ssr:false
const HomePage = dynamic(() => import("@/screens/HomePage"), { ssr: false });
const MoviesPage = dynamic(() => import("@/screens/MoviesPage"), { ssr: false });
const SeriesPage = dynamic(() => import("@/screens/SeriesPage"), { ssr: false });
const CategoriesPage = dynamic(() => import("@/screens/CategoriesPage"), { ssr: false });
const SearchPage = dynamic(() => import("@/screens/SearchPage"), { ssr: false });
const TrendingPage = dynamic(() => import("@/screens/TrendingPage"), { ssr: false });
const WatchPage = dynamic(() => import("@/screens/WatchPage"), { ssr: false });
const DetailsPage = dynamic(() => import("@/screens/DetailsPage"), { ssr: false });
const LiveTVPage = dynamic(() => import("@/screens/LiveTVPage"), { ssr: false });
const WatchLivePage = dynamic(() => import("@/screens/WatchLivePage"), { ssr: false });
const PrivacyPage = dynamic(() => import("@/screens/PrivacyPage"), { ssr: false });
const NotFoundPage = dynamic(() => import("@/screens/NotFoundPage"), { ssr: false });
const LoginPage = dynamic(() => import("@/screens/LoginPage"), { ssr: false });
const SetupPage = dynamic(() => import("@/screens/SetupPage"), { ssr: false });
const AdminDashboard = dynamic(() => import("@/admin/pages/Dashboard"), { ssr: false });
const AdminMovies = dynamic(() => import("@/admin/pages/MoviesAdmin"), { ssr: false });
const AdminSeries = dynamic(() => import("@/admin/pages/SeriesAdmin"), { ssr: false });
const AdminEpisodes = dynamic(() => import("@/admin/pages/EpisodesAdmin"), { ssr: false });
const AdminCategories = dynamic(() => import("@/admin/pages/CategoriesAdmin"), { ssr: false });
const AdminLiveTV = dynamic(() => import("@/admin/pages/LiveTVAdmin"), { ssr: false });
const AdminUsers = dynamic(() => import("@/admin/pages/UsersAdmin"), { ssr: false });
const AdminAnalytics = dynamic(() => import("@/admin/pages/AnalyticsAdmin"), { ssr: false });
const AdminSettings = dynamic(() => import("@/admin/pages/SettingsAdmin"), { ssr: false });

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="series" element={<SeriesPage />} />
          <Route path="live-tv" element={<LiveTVPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="trending" element={<TrendingPage />} />
          <Route path="details/:type/:id" element={<DetailsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
        </Route>
        <Route path="/watch/:type/:id" element={<WatchPage />} />
        <Route path="/watch-live/:id" element={<WatchLivePage />} />
        <Route
          path="/admin"
          element={<AdminRoute><AdminLayout /></AdminRoute>}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="movies" element={<AdminMovies />} />
          <Route path="series" element={<AdminSeries />} />
          <Route path="episodes" element={<AdminEpisodes />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="live-tv" element={<AdminLiveTV />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function ThemedSonnerToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      position="top-center"
      theme={(resolvedTheme as "light" | "dark") || "light"}
      toastOptions={{
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        },
      }}
    />
  );
}

// Client-only wrapper: Only renders children after hydration (when window is available)
// During SSR/prerendering, shows a loading screen instead
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <LoadingScreen />;
  return <>{children}</>;
}

export default function App() {
  useServiceWorker();
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <SettingsProvider>
          <DataProvider>
            <ClientOnly>
              <HashRouter>
                <ScrollToTop />
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </HashRouter>
            </ClientOnly>
            <ThemedSonnerToaster />
          </DataProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
