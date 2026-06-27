"use client";
import * as React from "react";
import { motion } from "framer-motion";
import {
  Link as LinkIcon,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------
   AdminPageHeader — consistent title + optional actions
----------------------------------------------------------------- */
export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   StatCard — used on Dashboard & Analytics
----------------------------------------------------------------- */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  accent = "#e50914",
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  hint?: string;
  accent?: string;
  delay?: number;
}) {
  const positive = (trend ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="bg-card border-border text-foreground overflow-hidden relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: accent }}
        />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/80 font-semibold">
                {label}
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-2 truncate">
                {value}
              </p>
              {hint && <p className="text-xs text-muted-foreground/80 mt-1">{hint}</p>}
              {typeof trend === "number" && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 mt-2 text-xs font-semibold",
                    positive ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {positive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {positive ? "+" : ""}
                  {trend}%{" "}
                  <span className="text-muted-foreground/80 font-normal">vs last week</span>
                </div>
              )}
            </div>
            <div
              className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: `${accent}22`, color: accent }}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ----------------------------------------------------------------
   MediaUrlField — link-based media input (no upload)

   All media (images, audio, video) on this platform is sourced from
   third-party URLs. There is NO file upload option — admins paste a
   direct link to the hosted asset instead.
----------------------------------------------------------------- */
export interface MediaUploadFieldProps {
  label: string;
  url: string;
  onUrlChange: (url: string) => void;
  /** Kept for API compatibility but ignored — uploads are disabled. */
  onFile?: (file: File, onProgress: (p: number) => void) => Promise<string>;
  accept?: string;
  hint?: string;
  preview?: "image" | "video" | "none";
}

export function MediaUploadField({
  label,
  url,
  onUrlChange,
  hint,
  preview = "image",
}: MediaUploadFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">
        {label}{" "}
        {hint && <span className="text-[10px] text-muted-foreground/70">({hint})</span>}
      </Label>
      <div className="relative">
        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
        <Input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/asset.jpg"
          className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/70"
        />
      </div>
      <p className="text-[10px] text-muted-foreground/70 break-all">
        Paste a direct link to a hosted asset (image / audio / video). No file upload — everything is link-based.
      </p>
      {preview === "image" && url && (
        <div className="mt-1 rounded-md overflow-hidden border border-border bg-background">
          <img
            src={url}
            alt={label}
            className="w-full max-h-32 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      {preview === "video" && url && (
        <VideoPreview url={url} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   VideoPreview — shows a small preview of the entered video URL.
   Uses a native <video> for direct media files, or an <iframe> for
   embed pages (abyssplayer, doodstream, YouTube, Vimeo, etc.).
----------------------------------------------------------------- */
function VideoPreview({ url }: { url: string }) {
  // Lazy-import the classifier to avoid a circular dependency.
  const info = React.useMemo(() => {
    // Inline lightweight version of classifyVideoSource for the preview.
    const lower = url.toLowerCase().split("?")[0].split("#")[0];
    const directExts = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".mkv", ".m3u8", ".mpd", ".ts"];
    const hasDirectExt = directExts.some((ext) => lower.endsWith(ext));
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "");
      const embedHosts = [
        "abyssplayer.com", "abyss.to", "doodstream.com", "dood.so", "dood.yt",
        "streamtape.com", "streamtape.to", "voe.sx", "voe-unblock.com",
        "mixdrop.co", "mixdrop.to", "upstream.to", "streamlare.com",
        "vidplay.site", "vidplay.online", "vidplay.lol", "filemoon.sx",
        "filemoon.to", "2embed.cc", "2embed.to", "embed.su", "vidsrc.to",
        "vidsrc.me",
      ];
      if (embedHosts.includes(host)) return { isEmbed: true, embedUrl: url };
      if (host === "youtube.com" || host === "m.youtube.com") {
        const id = u.searchParams.get("v");
        return { isEmbed: true, embedUrl: id ? `https://www.youtube.com/embed/${id}` : url };
      }
      if (host === "youtu.be") {
        const id = u.pathname.slice(1);
        return { isEmbed: true, embedUrl: id ? `https://www.youtube.com/embed/${id}` : url };
      }
      if (host === "vimeo.com") {
        const id = u.pathname.split("/").filter(Boolean)[0];
        return { isEmbed: true, embedUrl: id ? `https://player.vimeo.com/video/${id}` : url };
      }
      if (u.pathname.toLowerCase().includes("/embed/")) return { isEmbed: true, embedUrl: url };
      if (hasDirectExt) return { isEmbed: false, embedUrl: url };
      // Unknown host with no direct extension → treat as embed for safety.
      return { isEmbed: true, embedUrl: url };
    } catch {
      return { isEmbed: !hasDirectExt, embedUrl: url };
    }
  }, [url]);

  if (info.isEmbed) {
    return (
      <div className="mt-1 rounded-md overflow-hidden border border-border bg-background">
        <iframe
          src={info.embedUrl}
          title="Video preview"
          className="w-full max-h-32"
          style={{ border: "none", minHeight: "120px" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
        <p className="px-2 py-1 text-[10px] text-muted-foreground/70 bg-muted">
          Embed page preview — the player loads inside the iframe.
        </p>
      </div>
    );
  }

  return (
    <video
      src={url}
      className="mt-1 w-full max-h-32 rounded-md border border-border bg-background"
      controls
      muted
    />
  );
}

/* ----------------------------------------------------------------
   GenresInput — comma-separated tag input
----------------------------------------------------------------- */
export function GenresInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const commit = () => {
    const next = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (next.length) onChange([...value, ...next]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">Genres</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="Type a genre and press Enter"
          className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={commit}
          className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((g, i) => (
            <span
              key={`${g}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-primary/15 text-primary border border-primary/30"
            >
              {g}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-primary hover:text-foreground"
                aria-label={`Remove ${g}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------
   EmptyTableState — for tables with no rows (desktop table layout)
----------------------------------------------------------------- */
export function EmptyTableState({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-muted-foreground/80 py-10 text-sm">
        {message}
      </td>
    </tr>
  );
}

/* ----------------------------------------------------------------
   EmptyCardState — for mobile card layouts (no rows to display)
  Renders a single full-width card with a centered message.
  Used inside the `md:hidden` mobile card grid sections on each
  admin list page alongside the desktop `EmptyTableState`.
----------------------------------------------------------------- */
export function EmptyCardState({
  message,
  icon: Icon,
}: {
  message: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-center">
      {Icon && (
        <Icon className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
      )}
      <p className="text-sm text-muted-foreground/80">{message}</p>
    </div>
  );
}

/* ----------------------------------------------------------------
   ThumbImg — small image with fallback gradient
----------------------------------------------------------------- */
export function ThumbImg({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover bg-background", className)}
      onError={(e) => {
        const t = e.target as HTMLImageElement;
        t.style.background = "linear-gradient(135deg, var(--muted) 0%, var(--secondary) 100%)";
        t.removeAttribute("src");
      }}
    />
  ) : (
    <div
      className={cn(
        "bg-gradient-to-br from-muted to-secondary flex items-center justify-center",
        className
      )}
    >
      <span className="text-[10px] text-muted-foreground/70">No img</span>
    </div>
  );
}
