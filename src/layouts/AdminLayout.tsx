"use client";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Film,
  Tv,
  Clapperboard,
  LayoutGrid,
  Radio,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/shared/ThemeToggle";
import type { UserProfile } from "@/firebase/types";
import type { Settings } from "@/firebase/types";

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/movies", label: "Movies", icon: Film },
  { to: "/admin/series", label: "Series", icon: Tv },
  { to: "/admin/episodes", label: "Episodes", icon: Clapperboard },
  { to: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { to: "/admin/live-tv", label: "Live TV", icon: Radio },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

function getInitials(name?: string | null) {
  return (name || "A")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface SidebarContentProps {
  settings: Settings;
  user: UserProfile | null;
  isActive: (to: string, end?: boolean) => boolean;
  onNavigate: () => void;
  onLogout: () => void;
}

function SidebarContent({ settings, user, isActive, onNavigate, onLogout }: SidebarContentProps) {
  const initials = getInitials(user?.displayName || user?.email);
  return (
    <div className="flex flex-col h-full">
      <Link to="/admin" className="flex items-center gap-0.5 px-6 h-16 border-b border-border shrink-0">
        <span className="text-primary text-xl font-extrabold tracking-tight">
          {settings.siteName || "FLIX"}
        </span>
        {!settings.siteName && <span className="text-foreground text-xl font-extrabold tracking-tight">NET</span>}
        <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">Admin</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {adminNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(item.to, item.end)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4.5 h-4.5" /> View Site
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors"
        >
          <LogOut className="w-4.5 h-4.5" /> Sign Out
        </button>
      </div>

      <div className="border-t border-border p-3 flex items-center gap-3">
        <Avatar className="w-9 h-9 rounded border border-border">
          <AvatarImage src={user?.photoURL || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold rounded">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate text-foreground">{user?.displayName || "Admin"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (to: string, end?: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to) && location.pathname !== "/admin";

  const sidebarProps = {
    settings,
    user,
    isActive,
    onNavigate: () => setSidebarOpen(false),
    onLogout: () => logout(),
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar border-r border-sidebar-border flex-col sticky top-0 h-screen">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-sidebar border-r border-sidebar-border lg:hidden"
            >
              <SidebarContent {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-card border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="nav-icon-btn"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="flex items-center gap-0.5">
            <span className="text-primary text-lg font-extrabold">{settings.siteName || "FLIX"}</span>
            {!settings.siteName && <span className="text-foreground text-lg font-extrabold">NET</span>}
            <span className="ml-1 text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded uppercase">Admin</span>
          </span>
          <ThemeToggle />
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 items-center justify-end h-14 px-6 bg-background/80 backdrop-blur-md border-b border-border">
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
