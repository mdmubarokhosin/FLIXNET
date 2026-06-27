"use client";
import { motion } from "framer-motion";
import MovieCard from "./MovieCard";
import type { Movie, Series } from "@/firebase/types";

interface ContentGridProps {
  items: (Movie | Series)[];
  emptyMessage?: string;
}

export default function ContentGrid({ items, emptyMessage }: ContentGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-20 text-center">
        <p className="text-muted-foreground text-lg">{emptyMessage || "No content found."}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-12">
      {items.map((item, idx) => (
        <MovieCard key={item.id} item={item} index={idx} />
      ))}
    </div>
  );
}
