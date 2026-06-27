"use client";
import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Film,
  Tv,
  LayoutGrid,
  Eye,
  Plus,
  Film as FilmIcon,
  Tv as TvIcon,
  Clapperboard,
  LayoutGrid as GridIcon,
  Radio,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useData } from "@/context/DataContext";
import { fetchAllUsers } from "@/services/dataService";
import type { UserProfile } from "@/firebase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatViews, formatDate, timeAgo } from "@/utils/format";
import { AdminPageHeader, StatCard, ThumbImg, EmptyTableState } from "@/admin/components/AdminShared";

type RecentRow = {
  id: string;
  title: string;
  type: "movie" | "series";
  thumbnail: string;
  views: number;
  createdAt: number;
};

export default function Dashboard() {
  const { movies, series, categories, liveTVs, loading } = useData();
  const [users, setUsers] = React.useState<UserProfile[]>([]);

  React.useEffect(() => {
    let alive = true;
    fetchAllUsers()
      .then((u) => {
        if (alive) setUsers(u);
      })
      .catch(() => {
        if (alive) setUsers([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const totalViews = React.useMemo(
    () =>
      movies.reduce((a, m) => a + (m.views || 0), 0) +
      series.reduce((a, s) => a + (s.views || 0), 0) +
      liveTVs.reduce((a, c) => a + (c.views || 0), 0),
    [movies, series, liveTVs]
  );

  // Real, database-derived metrics (no demo numbers anywhere).
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newUsersThisWeek = React.useMemo(
    () => users.filter((u) => (u.createdAt || 0) > weekAgo).length,
    [users, weekAgo]
  );
  const newMoviesThisWeek = React.useMemo(
    () => movies.filter((m) => (m.createdAt || 0) > weekAgo).length,
    [movies, weekAgo]
  );
  const newSeriesThisWeek = React.useMemo(
    () => series.filter((s) => (s.createdAt || 0) > weekAgo).length,
    [series, weekAgo]
  );
  const adminCount = React.useMemo(
    () => users.filter((u) => u.role === "admin").length,
    [users]
  );

  const recent: RecentRow[] = React.useMemo(() => {
    const m: RecentRow[] = movies.map((x) => ({
      id: x.id,
      title: x.title,
      type: "movie",
      thumbnail: x.thumbnail,
      views: x.views || 0,
      createdAt: x.createdAt || 0,
    }));
    const s: RecentRow[] = series.map((x) => ({
      id: x.id,
      title: x.title,
      type: "series",
      thumbnail: x.thumbnail,
      views: x.views || 0,
      createdAt: x.createdAt || 0,
    }));
    return [...m, ...s]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [movies, series]);

  const viewsByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    const add = (catId: string | undefined, views: number) => {
      if (!catId) return;
      map.set(catId, (map.get(catId) || 0) + (views || 0));
    };
    movies.forEach((m) => add(m.category, m.views));
    series.forEach((s) => add(s.category, s.views));
    return categories
      .map((c) => ({
        name: c.name,
        views: map.get(c.id) || 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);
  }, [movies, series, categories]);

  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: Users,
      hint: users.length ? `${adminCount} admin${adminCount !== 1 ? "s" : ""} · ${newUsersThisWeek} new this week` : "No registered users yet",
      accent: "#14b8a6",
    },
    {
      label: "Total Movies",
      value: movies.length,
      icon: Film,
      hint: movies.length ? `${newMoviesThisWeek} added this week` : "Add your first movie",
      accent: "#e50914",
    },
    {
      label: "Total Series",
      value: series.length,
      icon: Tv,
      hint: series.length ? `${newSeriesThisWeek} added this week` : "Add your first series",
      accent: "#10b981",
    },
    {
      label: "Total Categories",
      value: categories.length,
      icon: LayoutGrid,
      hint: categories.length ? "Available for filtering" : "Create categories first",
      accent: "#f59e0b",
    },
    {
      label: "Live TV Channels",
      value: liveTVs.length,
      icon: Radio,
      hint: liveTVs.length ? `${liveTVs.filter((c) => c.live).length} currently live` : "Add your first channel",
      accent: "#06b6d4",
    },
    {
      label: "Total Views",
      value: formatViews(totalViews),
      icon: Eye,
      hint: totalViews > 0 ? "Across all content" : "No views recorded yet",
      accent: "#d946ef",
    },
  ];

  const quickActions = [
    { to: "/admin/movies", label: "Add Movie", icon: FilmIcon },
    { to: "/admin/series", label: "Add Series", icon: TvIcon },
    { to: "/admin/episodes", label: "Add Episode", icon: Clapperboard },
    { to: "/admin/categories", label: "Add Category", icon: GridIcon },
    { to: "/admin/live-tv", label: "Add Channel", icon: Radio },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Welcome back. Here's what's happening on your platform."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            hint={s.hint}
            accent={s.accent}
            delay={i * 0.05}
          />
        ))}
      </div>

      {/* Quick actions */}
      <Card className="bg-card border-border text-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Jump straight to common admin tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg bg-background border border-border hover:border-primary/40 hover:bg-accent transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center flex items-center gap-1">
                    {a.label} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="bg-card border-border text-foreground lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Recently Added
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Last 5 movies or series added to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile card layout */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {loading && recent.length === 0 ? (
                <div className="rounded-lg border border-border bg-background p-6 text-center">
                  <p className="text-sm text-muted-foreground/80">Loading recent activity…</p>
                </div>
              ) : recent.length === 0 ? (
                <div className="rounded-lg border border-border bg-background p-6 text-center">
                  <p className="text-sm text-muted-foreground/80">No content yet.</p>
                </div>
              ) : (
                recent.map((r, i) => (
                  <motion.div
                    key={`${r.type}-${r.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02 }}
                    className="rounded-lg border border-border bg-background p-3 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <ThumbImg
                        src={r.thumbnail}
                        alt={r.title}
                        className="w-10 h-14 rounded shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground line-clamp-2">
                          {r.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            r.type === "movie"
                              ? "border-primary/40 text-primary bg-primary/10 mt-1"
                              : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 mt-1"
                          }
                        >
                          {r.type === "movie" ? "Movie" : "Series"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {r.createdAt ? timeAgo(r.createdAt) : "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        {formatViews(r.views)}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground/80">Content</TableHead>
                    <TableHead className="text-muted-foreground/80">Type</TableHead>
                    <TableHead className="text-muted-foreground/80 text-right">Views</TableHead>
                    <TableHead className="text-muted-foreground/80">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && recent.length === 0 ? (
                    <EmptyTableState colSpan={4} message="Loading recent activity…" />
                  ) : recent.length === 0 ? (
                    <EmptyTableState colSpan={4} message="No content yet." />
                  ) : (
                    recent.map((r) => (
                      <TableRow key={`${r.type}-${r.id}`} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <ThumbImg
                              src={r.thumbnail}
                              alt={r.title}
                              className="w-10 h-14 rounded shrink-0"
                            />
                            <span className="font-medium text-sm line-clamp-2">
                              {r.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.type === "movie"
                                ? "border-primary/40 text-primary bg-primary/10"
                                : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                            }
                          >
                            {r.type === "movie" ? "Movie" : "Series"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatViews(r.views)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground/80">
                          {r.createdAt ? timeAgo(r.createdAt) : "—"}
                          {r.createdAt && (
                            <span className="block text-[10px] text-muted-foreground/70">
                              {formatDate(r.createdAt)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Views by Category chart */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Views by Category
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Top {viewsByCategory.length} categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewsByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground/80 text-center py-8">
                No data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={viewsByCategory}
                  margin={{ top: 5, right: 8, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <Tooltip
                    cursor={{ fill: "var(--accent)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                    {viewsByCategory.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          ["#e50914", "#ff6b6b", "#f59e0b", "#10b981", "#14b8a6", "#d946ef", "#ec4899", "#06b6d4"][i % 8]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center pt-2"
      >
        <Link to="/admin/analytics">
          <Button
            variant="outline"
            size="sm"
            className="bg-card border-border text-foreground hover:bg-accent hover:text-foreground"
          >
            View Full Analytics <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
