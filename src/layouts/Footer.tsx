"use client";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Youtube, Globe } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-card border-t border-border pt-12 pb-8 px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-0.5 mb-4">
              <span className="text-primary text-2xl font-extrabold tracking-tight">
                {settings.siteName || "FLIX"}
              </span>
              {!settings.siteName && <span className="text-foreground text-2xl font-extrabold tracking-tight">NET</span>}
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Stream unlimited movies & TV shows. Watch anywhere. Cancel anytime.
            </p>
            <div className="flex items-center gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="w-9 h-9 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-foreground flex items-center justify-center transition-colors"
                  aria-label="Social link"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4 text-sm uppercase tracking-wider">Browse</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/movies" className="text-muted-foreground hover:text-foreground transition-colors">Movies</Link></li>
              <li><Link to="/series" className="text-muted-foreground hover:text-foreground transition-colors">TV Series</Link></li>
              <li><Link to="/live-tv" className="text-muted-foreground hover:text-foreground transition-colors">Live TV</Link></li>
              <li><Link to="/trending" className="text-muted-foreground hover:text-foreground transition-colors">Trending</Link></li>
              <li><Link to="/categories" className="text-muted-foreground hover:text-foreground transition-colors">Categories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4 text-sm uppercase tracking-wider">Account</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/my-list" className="text-muted-foreground hover:text-foreground transition-colors">My List</Link></li>
              <li><Link to="/history" className="text-muted-foreground hover:text-foreground transition-colors">Watch History</Link></li>
              <li><Link to="/subscription" className="text-muted-foreground hover:text-foreground transition-colors">Plans</Link></li>
              <li><Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">Profile</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground transition-colors">Terms of Use</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground transition-colors">Cookie Preferences</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <p className="text-muted-foreground text-xs">
            © {year} {settings.siteName || "FLIXNET"}. All rights reserved. Built for demo purposes.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Globe className="w-3.5 h-3.5" />
            <span>English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
