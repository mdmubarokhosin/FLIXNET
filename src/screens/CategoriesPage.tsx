"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Flame,
  Drama,
  Laugh,
  Rocket,
  Ghost,
  Heart,
  Zap,
  BookOpen,
  Clapperboard,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/shared/PageHeader";
import ContentGrid from "@/components/shared/ContentGrid";
import SkeletonGrid from "@/components/shared/SkeletonGrid";
import EmptyState from "@/components/shared/EmptyState";
import { useData } from "@/context/DataContext";
import type { ContentItem } from "@/firebase/types";

const iconMap: Record<string, LucideIcon> = {
  Flame,
  Drama,
  Laugh,
  Rocket,
  Ghost,
  Heart,
  Zap,
  BookOpen,
};

function getIcon(name?: string): LucideIcon {
  if (name && iconMap[name]) return iconMap[name];
  return Clapperboard;
}

// Per-category gradient palette (avoids blue/indigo)
const gradients = [
  "from-red-600/80 via-rose-700/60 to-muted",
  "from-amber-600/80 via-orange-700/60 to-muted",
  "from-emerald-600/80 via-teal-700/60 to-muted",
  "from-fuchsia-600/80 via-purple-700/60 to-muted",
  "from-rose-700/80 via-red-800/60 to-muted",
  "from-yellow-600/80 via-amber-700/60 to-muted",
  "from-orange-600/80 via-red-700/60 to-muted",
  "from-purple-700/80 via-fuchsia-800/60 to-muted",
];

export default function CategoriesPage() {
  const { movies, series, categories, loading } = useData();
  const [searchParams] = useSearchParams();
  const [userPick, setUserPick] = useState<string | null>(null);

  // Derive selected from URL ?cat= unless the user manually picks a category
  // (userPick takes priority so clicking a card updates the view immediately).
  const catParam = searchParams.get("cat");
  const selected = userPick ?? (catParam && categories.some((c) => c.id === catParam) ? catParam : "all");

  const all: ContentItem[] = useMemo(() => [...movies, ...series], [movies, series]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    all.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return map;
  }, [all]);

  const items = useMemo(() => {
    if (selected === "all") return all;
    return all.filter((i) => i.category === selected);
  }, [all, selected]);

  const selectedCat = categories.find((c) => c.id === selected);

  // Wrap setUserPick so clicks still update local state instantly
  const pick = (id: string) => setUserPick(id);

  return (
    <div className="pb-12">
      <PageHeader
        title="Categories"
        subtitle="Discover content by genre and category"
        icon={<LayoutGrid className="w-7 h-7" />}
      />

      {/* Category cards grid */}
      <div className="px-4 sm:px-6 lg:px-12 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {/* "All" card */}
          <CategoryCard
            label="All"
            count={all.length}
            gradient="from-primary/80 via-[#b1060f]/60 to-muted"
            active={selected === "all"}
            onClick={() => pick("all")}
            Icon={LayoutGrid}
            index={0}
          />
          {categories.map((cat, idx) => {
            const Icon = getIcon(cat.icon);
            return (
              <CategoryCard
                key={cat.id}
                label={cat.name}
                count={counts[cat.id] || 0}
                gradient={gradients[idx % gradients.length]}
                active={selected === cat.id}
                onClick={() => pick(cat.id)}
                Icon={Icon}
                index={idx + 1}
              />
            );
          })}
        </div>
      </div>

      {/* Selected category header */}
      <div className="px-4 sm:px-6 lg:px-12 mb-4">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-end justify-between gap-3 border-b border-border pb-3"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {selected === "all" ? "All Content" : selectedCat?.name || "Content"}
            </h2>
            {selectedCat?.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{selectedCat.description}</p>
            )}
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            <span className="text-foreground font-semibold">{items.length}</span> title{items.length !== 1 ? "s" : ""}
          </span>
        </motion.div>
      </div>

      {/* Results */}
      {loading ? (
        <SkeletonGrid count={18} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No content in this category"
          description="Check back later as we add new titles to this category."
        />
      ) : (
        <ContentGrid items={items} />
      )}
    </div>
  );
}

interface CategoryCardProps {
  label: string;
  count: number;
  gradient: string;
  active: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  index: number;
}

function CategoryCard({ label, count, gradient, active, onClick, Icon, index }: CategoryCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative text-left rounded-lg overflow-hidden h-24 sm:h-28 p-3 sm:p-4 bg-gradient-to-br ${gradient} border transition-colors ${
        active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-border"
      }`}
      aria-pressed={active}
    >
      <div className="relative z-10 flex flex-col justify-between h-full">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white/90" />
        <div>
          <div className="text-white font-bold text-sm sm:text-base leading-tight">{label}</div>
          <div className="text-white/70 text-xs">{count} title{count !== 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className="absolute -right-3 -bottom-3 opacity-20">
        <Icon className="w-20 h-20 sm:w-24 sm:h-24 text-white" />
      </div>
    </motion.button>
  );
}
