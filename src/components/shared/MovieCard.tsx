"use client";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Plus, Check, Star, Info } from "lucide-react";
import type { Movie, Series } from "@/firebase/types";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRating } from "@/utils/format";

interface MovieCardProps {
  item: Movie | Series;
  index?: number;
  className?: string;
}

export default function MovieCard({ item, index = 0, className }: MovieCardProps) {
  const { getCategoryById } = useData();
  const navigate = useNavigate();
  const [inList, setInList] = useState(false);
  const category = getCategoryById(item.category);

  // Defensive fallbacks for partial/incomplete data records
  const title = item.title || "Untitled";
  const year = item.year || "—";
  const duration = item.duration || "—";
  const type = item.type || "movie";

  const handleToggleList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInList(!inList);
    toast.success(inList ? "Removed from My List" : "Added to My List");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      className={cn("card-hover group relative shrink-0 w-full", className)}
    >
      <Link to={`/details/${item.type}/${item.id}`} className="block">
        {/* Poster */}
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted ring-1 ring-border">
          <img
            src={item.thumbnail || `https://picsum.photos/seed/${item.id}/500/750`}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/500/750`;
            }}
          />

          {/* Top-left badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {item.trending && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shadow-md">
                Trending
              </span>
            )}
            {item.featured && (
              <span className="bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shadow-md">
                Featured
              </span>
            )}
          </div>

          {/* Top-right: quality + rating */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            <span className="bg-yellow-400/90 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider shadow-md">
              HD
            </span>
            <span className="flex items-center gap-1 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded text-[11px] font-semibold text-white">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {formatRating(item.rating)}
            </span>
          </div>

          {/* Bottom gradient always visible (subtle) */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <div className="flex items-center gap-2 text-[10px] text-white/70 mb-2">
              <span className="bg-white/20 backdrop-blur px-1.5 py-0.5 rounded uppercase font-semibold">{type}</span>
              <span>{year}</span>
              {category && (
                <>
                  <span>•</span>
                  <span className="truncate">{category.name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded transition-colors group-hover:bg-primary/90">
                <Play className="w-3.5 h-3.5 fill-white" /> Play
              </span>
              <button
                onClick={handleToggleList}
                className="w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/30 backdrop-blur rounded transition-colors"
                aria-label={inList ? "Remove from list" : "Add to list"}
              >
                {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
              <span className="w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/30 backdrop-blur rounded transition-colors">
                <Info className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Title below poster — always visible (net11.cc style) */}
        <div className="mt-2 px-0.5">
          <h3 className="text-foreground text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
            <span>{year}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{duration}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="uppercase">{type}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
