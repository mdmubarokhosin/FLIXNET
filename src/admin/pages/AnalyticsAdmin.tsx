"use client";
import * as React from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Film,
  Tv,
  Star,
  Trophy,
  BarChart3,
  TrendingUp,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useData } from "@/context/DataContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatViews } from "@/utils/format";
import {
  AdminPageHeader,
  StatCard,
  ThumbImg,
  EmptyTableState,
} from "@/admin/components/AdminShared";

const PIE_COLORS = [
  "#e50914",
  "#ff6b6b",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
  fontSize: 12,
};

export default function AnalyticsAdmin() {
  const { movies, series, categories, getCategoryById, loading } = useData();

  const totalViews = React.useMemo(
    () =>
      movies.reduce((a, m) => a + (m.views || 0), 0) +
      series.reduce((a, s) => a + (s.views || 0), 0),
    [movies, series]
  );

  const topMovies = React.useMemo(
    () => [...movies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10),
    [movies]
  );
  const topSeries = React.useMemo(
    () => [...series].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10),
    [series]
  );

  const mostViewedMovie = topMovies[0];
  const mostViewedSeries = topSeries[0];

  const avgRating = React.useMemo(() => {
    const items = [...movies, ...series];
    if (items.length === 0) return 0;
    const sum = items.reduce((a, x) => a + (x.rating || 0), 0);
    return Math.round((sum / items.length) * 10) / 10;
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
        value: map.get(c.id) || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [movies, series, categories]);

  const topContentCombined = React.useMemo(() => {
    const combined: {
      id: string;
      title: string;
      type: "movie" | "series";
      thumbnail: string;
      views: number;
      rating: number;
      category?: string;
    }[] = [
      ...movies.map((m) => ({
        id: m.id,
        title: m.title,
        type: "movie" as const,
        thumbnail: m.thumbnail,
        views: m.views || 0,
        rating: m.rating || 0,
        category: m.category,
      })),
      ...series.map((s) => ({
        id: s.id,
        title: s.title,
        type: "series" as const,
        thumbnail: s.thumbnail,
        views: s.views || 0,
        rating: s.rating || 0,
        category: s.category,
      })),
    ];
    return combined.sort((a, b) => b.views - a.views).slice(0, 20);
  }, [movies, series]);

  // Mock "views over time" — derive from createdAt as buckets per month
  const viewsOverTime = React.useMemo(() => {
    const buckets = new Map<string, number>();
    const items = [...movies, ...series];
    items.forEach((it) => {
      const ts = it.createdAt || Date.now();
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) || 0) + (it.views || 0));
    });
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, value]) => {
        const [y, m] = key.split("-");
        const date = new Date(Number(y), Number(m) - 1, 1);
        return {
          label: date.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          views: value,
        };
      });
  }, [movies, series]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        description="Performance insights across your content library"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Views"
          value={formatViews(totalViews)}
          icon={Eye}
          trend={18}
          accent="#8b5cf6"
          delay={0}
        />
        <StatCard
          label="Top Movie"
          value={mostViewedMovie?.title || "—"}
          icon={Film}
          accent="#e50914"
          hint={
            mostViewedMovie
              ? `${formatViews(mostViewedMovie.views)} views`
              : "No movies yet"
          }
          delay={0.05}
        />
        <StatCard
          label="Top Series"
          value={mostViewedSeries?.title || "—"}
          icon={Tv}
          accent="#10b981"
          hint={
            mostViewedSeries
              ? `${formatViews(mostViewedSeries.views)} views`
              : "No series yet"
          }
          delay={0.1}
        />
        <StatCard
          label="Avg Rating"
          value={avgRating.toFixed(1)}
          icon={Star}
          accent="#f59e0b"
          hint={`${movies.length + series.length} items rated`}
          delay={0.15}
        />
      </div>

      {/* Top movies + Top series bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" /> Top 10 Movies by Views
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Most watched movies on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topMovies.length === 0 ? (
              <p className="text-sm text-muted-foreground/80 text-center py-8">No movies yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topMovies.map((m) => ({
                    name: m.title.length > 18 ? m.title.slice(0, 16) + "…" : m.title,
                    views: m.views || 0,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)" }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="views" radius={[0, 4, 4, 0]} fill="#e50914" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" /> Top 10 Series by Views
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Most watched series on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground/80 text-center py-8">No series yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topSeries.map((s) => ({
                    name: s.title.length > 18 ? s.title.slice(0, 16) + "…" : s.title,
                    views: s.views || 0,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)" }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="views" radius={[0, 4, 4, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Views by category (pie) + Views over time (line) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Views by Category
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Distribution of views across categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewsByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground/80 text-center py-8">No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={viewsByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    style={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  >
                    {viewsByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Views Over Time
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Content views bucketed by month added (last 12 months)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewsOverTime.length === 0 ? (
              <p className="text-sm text-muted-foreground/80 text-center py-8">No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={viewsOverTime}
                  margin={{ top: 5, right: 16, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 20 combined table */}
      <Card className="bg-card border-border text-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Top 20 Most Viewed
          </CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Movies and series combined, ranked by views
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile card layout */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {loading && topContentCombined.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-6 text-center">
                <p className="text-sm text-muted-foreground/80">Loading analytics…</p>
              </div>
            ) : topContentCombined.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-6 text-center">
                <p className="text-sm text-muted-foreground/80">No content available.</p>
              </div>
            ) : (
              topContentCombined.map((c, i) => {
                const cat = getCategoryById(c.category || "");
                return (
                  <motion.div
                    key={`${c.type}-${c.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02 }}
                    className="rounded-lg border border-border bg-background p-3 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                          i === 0
                            ? "bg-amber-500 text-black"
                            : i === 1
                            ? "bg-slate-400 text-black"
                            : i === 2
                            ? "bg-amber-700 text-white"
                            : "bg-accent text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <ThumbImg
                        src={c.thumbnail}
                        alt={c.title}
                        className="w-10 h-14 rounded shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground line-clamp-2">
                          {c.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            c.type === "movie"
                              ? "border-primary/40 text-primary bg-primary/10 mt-1"
                              : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 mt-1"
                          }
                        >
                          {c.type === "movie" ? (
                            <>
                              <Film className="w-3 h-3" /> Movie
                            </>
                          ) : (
                            <>
                              <Tv className="w-3 h-3" /> Series
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        {cat?.name || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {Number(c.rating).toFixed(1)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground ml-auto">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                        {formatViews(c.views)}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground/80 w-12">#</TableHead>
                  <TableHead className="text-muted-foreground/80 min-w-[220px]">Title</TableHead>
                  <TableHead className="text-muted-foreground/80">Type</TableHead>
                  <TableHead className="text-muted-foreground/80">Category</TableHead>
                  <TableHead className="text-muted-foreground/80">Rating</TableHead>
                  <TableHead className="text-muted-foreground/80 text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && topContentCombined.length === 0 ? (
                  <EmptyTableState colSpan={6} message="Loading analytics…" />
                ) : topContentCombined.length === 0 ? (
                  <EmptyTableState colSpan={6} message="No content available." />
                ) : (
                  topContentCombined.map((c, i) => {
                    const cat = getCategoryById(c.category || "");
                    return (
                      <motion.tr
                        key={`${c.type}-${c.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-border hover:bg-muted/50"
                      >
                        <TableCell>
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              i === 0
                                ? "bg-amber-500 text-black"
                                : i === 1
                                ? "bg-slate-400 text-black"
                                : i === 2
                                ? "bg-amber-700 text-white"
                                : "bg-accent text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <ThumbImg
                              src={c.thumbnail}
                              alt={c.title}
                              className="w-10 h-14 rounded shrink-0"
                            />
                            <span className="font-medium text-sm text-foreground line-clamp-2">
                              {c.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              c.type === "movie"
                                ? "border-primary/40 text-primary bg-primary/10"
                                : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                            }
                          >
                            {c.type === "movie" ? (
                              <>
                                <Film className="w-3 h-3" /> Movie
                              </>
                            ) : (
                              <>
                                <Tv className="w-3 h-3" /> Series
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cat?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {Number(c.rating).toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-foreground">
                          {formatViews(c.views)}
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
