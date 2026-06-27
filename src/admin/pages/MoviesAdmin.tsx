"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Film, Star, Eye, Flame, TrendingUp, Film as FilmIcon } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useSettings } from "@/context/SettingsContext";
import { saveMovie, deleteMovie } from "@/services/dataService";
import type { Movie } from "@/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ThumbImg,
  EmptyTableState,
  EmptyCardState,
} from "@/admin/components/AdminShared";
import {
  ContentForm,
  type MovieFormValues,
} from "@/admin/components/ContentForm";

const PAGE_SIZE = 10;

export default function MoviesAdmin() {
  const { movies, categories, getCategoryById, loading } = useData();
  const { settings } = useSettings();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Movie | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? movies.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            (m.director || "").toLowerCase().includes(q)
        )
      : movies;
    return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [movies, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (m: Movie) => {
    setEditing(m);
    setDialogOpen(true);
  };

  const handleSubmit = async (vals: MovieFormValues) => {
    try {
      await saveMovie({
        id: editing?.id,
        title: vals.title,
        description: vals.description,
        thumbnail: vals.thumbnail,
        banner: vals.banner,
        videoURL: vals.videoURL,
        category: vals.category,
        genres: vals.genres,
        year: Number(vals.year),
        rating: Number(vals.rating),
        duration: vals.duration,
        featured: vals.featured,
        trending: vals.trending,
        trailerURL: vals.trailerURL,
        cast: vals.cast
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        director: vals.director,
        screenshots: vals.screenshots
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success(editing ? "Movie updated" : "Movie created", {
        description: vals.title,
      });
      setDialogOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save movie";
      toast.error("Save failed", { description: msg });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = movies.find((m) => m.id === deleteId);
    try {
      await deleteMovie(deleteId);
      toast.success("Movie deleted", { description: target?.title || "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeleteId(null);
    }
  };

  const emptyMessage = search
    ? "No movies match your search."
    : 'No movies yet. Click "Add Movie" to create one.';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Movies"
        description={`${movies.length} movies on the platform`}
      >
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4" /> Add Movie
        </Button>
      </AdminPageHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movies by title or director…"
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {loading && movies.length === 0 ? (
          <EmptyCardState message="Loading movies…" icon={FilmIcon} />
        ) : paged.length === 0 ? (
          <EmptyCardState message={emptyMessage} icon={FilmIcon} />
        ) : (
          paged.map((m, i) => {
            const cat = getCategoryById(m.category);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                className="rounded-lg border border-border bg-card p-3 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <ThumbImg
                    src={m.thumbnail}
                    alt={m.title}
                    className="w-12 h-16 rounded shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground line-clamp-1">
                      {m.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {m.duration || "—"} · {m.director || "Unknown"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                      onClick={() => openEdit(m)}
                      aria-label="Edit movie"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => setDeleteId(m.id)}
                      aria-label="Delete movie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground bg-muted"
                  >
                    {cat?.name || "—"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{m.year}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {Number(m.rating).toFixed(1)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {formatViews(m.views || 0)}
                  </span>
                  {m.featured && (
                    <Badge className="bg-primary text-primary-foreground border-transparent">
                      <Flame className="w-3 h-3" /> Featured
                    </Badge>
                  )}
                  {m.trending && (
                    <Badge className="bg-amber-500 text-black border-transparent">
                      <TrendingUp className="w-3 h-3" /> Trending
                    </Badge>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground/80 min-w-[240px]">Movie</TableHead>
              <TableHead className="text-muted-foreground/80">Category</TableHead>
              <TableHead className="text-muted-foreground/80">Year</TableHead>
              <TableHead className="text-muted-foreground/80">Rating</TableHead>
              <TableHead className="text-muted-foreground/80 text-right">Views</TableHead>
              <TableHead className="text-muted-foreground/80">Badges</TableHead>
              <TableHead className="text-muted-foreground/80 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && movies.length === 0 ? (
              <EmptyTableState colSpan={7} message="Loading movies…" />
            ) : paged.length === 0 ? (
              <EmptyTableState colSpan={7} message={emptyMessage} />
            ) : (
              paged.map((m, i) => {
                const cat = getCategoryById(m.category);
                return (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-border hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <ThumbImg
                          src={m.thumbnail}
                          alt={m.title}
                          className="w-10 h-14 rounded shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground line-clamp-1">
                            {m.title}
                          </p>
                          <p className="text-xs text-muted-foreground/70 line-clamp-1">
                            {m.duration || "—"} · {m.director || "Unknown"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-border text-muted-foreground bg-muted"
                      >
                        {cat?.name || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.year}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {Number(m.rating).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
                        {formatViews(m.views || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {m.featured && (
                          <Badge className="bg-primary text-primary-foreground border-transparent">
                            <Flame className="w-3 h-3" /> Featured
                          </Badge>
                        )}
                        {m.trending && (
                          <Badge className="bg-amber-500 text-black border-transparent">
                            <TrendingUp className="w-3 h-3" /> Trending
                          </Badge>
                        )}
                        {!m.featured && !m.trending && (
                          <span className="text-xs text-muted-foreground/70">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                          onClick={() => openEdit(m)}
                          aria-label="Edit movie"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setDeleteId(m.id)}
                          aria-label="Delete movie"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground/80">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="bg-card border-border text-foreground hover:bg-accent hover:text-foreground"
            >
              Prev
            </Button>
            <span className="px-3 py-1.5 text-sm text-muted-foreground/80">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="bg-card border-border text-foreground hover:bg-accent hover:text-foreground"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="bg-card border-border text-foreground max-w-2xl w-[calc(100vw-1rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Film className="w-5 h-5 text-primary" />
              {editing ? "Edit Movie" : "Add Movie"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {editing
                ? "Update the movie details below."
                : "Fill in the details below to add a new movie."}
            </DialogDescription>
          </DialogHeader>
          <ContentForm
            mode={editing ? "edit" : "create"}
            kind="movie"
            initial={editing || undefined}
            categories={categories}
            onSubmit={handleSubmit as (v: MovieFormValues) => Promise<void>}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
            tmdbApiKey={settings.tmdbApiKey}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] sm:w-full md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete this movie?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone. The movie and its data will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
