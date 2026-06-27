"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Radio,
  Tv,
  Eye,
  Globe,
  Languages,
  Loader2,
  AlertCircle,
  Share2,
  Play,
  ListVideo,
} from "lucide-react";
import { toast } from "sonner";
import VideoPlayer from "@/components/player/VideoPlayer";
import type { SubtitleTrack } from "@/components/player/VideoPlayer";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { incrementViews } from "@/services/dataService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatViews } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { LiveTVChannel } from "@/firebase/types";

/** Lightweight inline video source classifier (replaces deleted @/utils/videoSource) */
function classifyVideoSource(url: string) {
  const lower = url.toLowerCase().split("?")[0].split("#")[0];
  const directExts = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".mkv", ".m3u8", ".mpd", ".ts"];
  const isDirect = directExts.some((ext) => lower.endsWith(ext));
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const embedHosts = [
      "youtube.com", "m.youtube.com", "youtu.be",
      "vimeo.com", "abyssplayer.com", "abyss.to",
      "doodstream.com", "dood.so", "dood.yt",
      "streamtape.com", "streamtape.to", "voe.sx",
      "mixdrop.co", "mixdrop.to", "upstream.to",
      "streamlare.com", "vidplay.site", "vidplay.online",
      "vidplay.lol", "filemoon.sx", "filemoon.to",
      "2embed.cc", "2embed.to", "embed.su",
      "vidsrc.to", "vidsrc.me",
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
    if (isDirect) return { isEmbed: false, embedUrl: url };
    return { isEmbed: true, embedUrl: url };
  } catch {
    return { isEmbed: !isDirect, embedUrl: url };
  }
}

export default function WatchLivePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLiveTVById, liveTVs, getCategoryById } = useData();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Resolve the channel — either the URL one, or a user-picked one from the sidebar
  const activeId = selectedChannelId || id;
  const channel = useMemo(
    () => (activeId ? getLiveTVById(activeId) : undefined),
    [activeId, getLiveTVById]
  );

  const viewsIncrementedRef = useRef<string | null>(null);

  // Track views increment on mount / channel change.
  // Recently-watched tracking removed after Firestore migration.
  useEffect(() => {
    if (!activeId) return;
    if (viewsIncrementedRef.current === activeId) return;
    viewsIncrementedRef.current = activeId;
    incrementViews("series", activeId).catch(() => {
      /* ignore */
    });
  }, [activeId]);

  // Reset the user-selected channel when the URL id changes (browser back/forward)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedChannelId(null);
  }, [id]);

  if (!channel) {
    const stillLoading = !activeId;
    if (stillLoading) {
      return (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      );
    }
    return (
      <NotFoundView
        message="The channel you're looking for could not be found."
        onBack={() => navigate("/live-tv")}
      />
    );
  }

  const effectiveStreamURL = channel.streamURL || "";
  const sourceInfo = classifyVideoSource(effectiveStreamURL);
  const category = channel.category ? getCategoryById(channel.category) : undefined;
  const otherChannels = liveTVs.filter((c) => c.id !== channel.id).slice(0, 30);

  const handleShare = async () => {
    const url = `${window.location.origin}/#/watch-live/${channel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: channel.name, text: channel.description || channel.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled share */
    }
  };

  const handleSelectChannel = (c: LiveTVChannel) => {
    setSelectedChannelId(c.id);
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <Link
          to="/live-tv"
          className="pointer-events-auto inline-flex items-center gap-1.5 text-white hover:text-primary transition-colors bg-black/40 hover:bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">All Channels</span>
        </Link>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-white bg-black/40 hover:bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-sm font-medium"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Main player area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Player */}
        <div className="flex-1 relative bg-black">
          {effectiveStreamURL ? (
            sourceInfo.isEmbed ? (
              <iframe
                src={sourceInfo.embedUrl}
                title={channel.name}
                className="absolute inset-0 w-full h-full"
                style={{ border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : (
              <VideoPlayer
                src={effectiveStreamURL}
                poster={channel.banner || channel.logo}
                title={channel.name}
                subtitles={[] as SubtitleTrack[]}
                isLive
              />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm">No stream URL configured for this channel.</p>
            </div>
          )}

          {/* Channel info bar */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-3 md:p-5 bg-gradient-to-t from-black/85 to-transparent pointer-events-none">
            <div className="flex items-end gap-3">
              {channel.logo && (
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-primary/60 bg-muted shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded",
                      channel.live ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {channel.live && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                    {channel.live ? "LIVE" : "OFFLINE"}
                  </span>
                  {category && (
                    <Badge variant="outline" className="border-white/30 text-white/90 bg-black/40 text-[10px]">
                      {category.name}
                    </Badge>
                  )}
                </div>
                <h2 className="text-white text-lg sm:text-xl font-bold line-clamp-1 drop-shadow">
                  {channel.name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-white/70 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViews(channel.views || 0)}
                  </span>
                  {channel.language && (
                    <span className="inline-flex items-center gap-1">
                      <Languages className="w-3 h-3" />
                      {channel.language}
                    </span>
                  )}
                  {channel.country && (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {channel.country}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {channel.description && (
              <p className="text-white/70 text-xs sm:text-sm mt-2 line-clamp-2 max-w-2xl">
                {channel.description}
              </p>
            )}
          </div>
        </div>

        {/* Channel list sidebar (desktop) */}
        <aside className="hidden md:flex w-[340px] lg:w-[380px] bg-card border-l border-border flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="text-foreground text-sm font-bold flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" />
              More Channels
            </h3>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              {otherChannels.length} other live channels
            </p>
          </div>
          <ChannelList
            channels={otherChannels}
            activeId={channel.id}
            getCategoryById={getCategoryById}
            onSelect={handleSelectChannel}
          />
        </aside>
      </div>

      {/* Mobile channel drawer toggle */}
      <MobileChannelDrawer
        channels={otherChannels}
        activeId={channel.id}
        getCategoryById={getCategoryById}
        onSelect={handleSelectChannel}
      />
    </div>
  );
}

/* ----------------------------------------------------------------
   ChannelList — scrollable list of other channels (desktop sidebar)
----------------------------------------------------------------- */
function ChannelList({
  channels,
  activeId,
  getCategoryById,
  onSelect,
}: {
  channels: LiveTVChannel[];
  activeId: string;
  getCategoryById: (id: string) => { name: string } | undefined;
  onSelect: (c: LiveTVChannel) => void;
}) {
  if (channels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-muted-foreground/80 text-sm p-6">
        No other channels available.
      </div>
    );
  }
  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {channels.map((c) => {
          const isActive = c.id === activeId;
          const cat = getCategoryById(c.category);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={cn(
                "group w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                isActive ? "bg-accent" : "hover:bg-muted"
              )}
            >
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/50 transition-all">
                <img
                  src={c.logo || c.banner}
                  alt={c.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${c.id}/120/120`;
                  }}
                />
                {c.live && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[7px] font-bold px-1 py-0.5 rounded-full border border-background flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-semibold truncate">{c.name}</p>
                <p className="text-muted-foreground text-xs truncate">
                  {cat?.name || "Uncategorized"} · {formatViews(c.views || 0)}
                </p>
              </div>
              {!isActive && (
                <Play className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

/* ----------------------------------------------------------------
   MobileChannelDrawer — collapsible bottom drawer for mobile
----------------------------------------------------------------- */
function MobileChannelDrawer({
  channels,
  activeId,
  getCategoryById,
  onSelect,
}: {
  channels: LiveTVChannel[];
  activeId: string;
  getCategoryById: (id: string) => { name: string } | undefined;
  onSelect: (c: LiveTVChannel) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold rounded-full px-4 py-2.5 shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Tv className="w-4 h-4" />
        Channels
      </button>
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-50"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] bg-card border-t border-border rounded-t-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-foreground text-lg font-bold">More Channels</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Close"
              >
                <ArrowLeft className="w-5 h-5 rotate-90" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              <ChannelList
                channels={channels}
                activeId={activeId}
                getCategoryById={getCategoryById}
                onSelect={(c) => {
                  onSelect(c);
                  setOpen(false);
                }}
              />
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}

function NotFoundView({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <AlertCircle className="w-14 h-14 text-primary mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-2">Channel unavailable</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button onClick={onBack} className="bg-white text-black hover:bg-white/90">
          <ArrowLeft className="w-4 h-4" /> Back to Live TV
        </Button>
      </div>
    </div>
  );
}
