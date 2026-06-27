"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Clapperboard,
  Eye,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { saveEpisode, deleteEpisode } from "@/services/dataService";
import type { Episode } from "@/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  MediaUploadField,
} from "@/admin/components/AdminShared";

interface EpisodeFormValues {
  seriesId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnail: string;
  videoURL: string;
  duration: string;
}

const inputCls = "bg-background border-border text-foreground placeholder:text-muted-foreground/70";

export default function EpisodesAdmin() {
  const { series, getEpisodesBySeries, loading } = useData();
  const [seriesId, setSeriesId] = React.useState<string>("");
  const [season, setSeason] = React.useState<number>(1);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Episode | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Default series = first available
  React.useEffect(() => {
    if (!seriesId && series.length > 0) setSeriesId(series[0].id);
  }, [series, seriesId]);

  const selectedSeries = React.useMemo(
    () => series.find((s) => s.id === seriesId),
    [series, seriesId]
  );

  const seasons = React.useMemo(
    () => Array.from({ length: selectedSeries?.seasons || 1 }, (_, i) => i + 1),
    [selectedSeries]
  );

  const episodes = React.useMemo(() => {
    if (!seriesId) return [];
    return getEpisodesBySeries(seriesId)
      .filter((e) => e.season === season)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [seriesId, season, getEpisodesBySeries]);

  React.useEffect(() => {
    if (season > (selectedSeries?.seasons || 1)) setSeason(1);
  }, [selectedSeries, season]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (e: Episode) => {
    setEditing(e);
    setDialogOpen(true);
  };

  const onSubmit = async (vals: EpisodeFormValues) => {
    try {
      await saveEpisode({
        id: editing?.id,
        seriesId: vals.seriesId,
        season: Number(vals.season),
        episodeNumber: Number(vals.episodeNumber),
        title: vals.title,
        description: vals.description,
        thumbnail: vals.thumbnail,
        videoURL: vals.videoURL,
        duration: vals.duration,
      });
      toast.success(editing ? "Episode updated" : "Episode created", {
        description: `S${vals.season}E${vals.episodeNumber} — ${vals.title}`,
      });
      setDialogOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save episode";
      toast.error("Save failed", { description: msg });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = episodes.find((e) => e.id === deleteId);
    try {
      await deleteEpisode(deleteId);
      toast.success("Episode deleted", {
        description: target?.title || "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeleteId(null);
    }
  };

  const emptyMessage = !seriesId
    ? "Select a series above to view its episodes."
    : `No episodes in Season ${season} yet. Click "Add Episode" to create one.`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Episodes"
        description="Manage episodes for each series and season"
      >
        <Button
          onClick={openCreate}
          disabled={!seriesId}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4" /> Add Episode
        </Button>
      </AdminPageHeader>

      {/* Selectors — full width on mobile, 2 cols on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Series</Label>
          <Select value={seriesId} onValueChange={setSeriesId}>
            <SelectTrigger className={`w-full ${inputCls}`}>
              <SelectValue placeholder="Select a series" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground max-h-72">
              {series.length === 0 ? (
                <SelectItem value="__none" disabled>
                  No series available
                </SelectItem>
              ) : (
                series.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Season</Label>
          <Select
            value={String(season)}
            onValueChange={(v) => setSeason(Number(v))}
          >
            <SelectTrigger className={`w-full ${inputCls}`}>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {seasons.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  Season {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedSeries && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-card border border-border">
          <ThumbImg
            src={selectedSeries.thumbnail}
            alt={selectedSeries.title}
            className="w-10 h-14 rounded shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {selectedSeries.title}
            </p>
            <p className="text-xs text-muted-foreground/80">
              {selectedSeries.seasons} season
              {selectedSeries.seasons > 1 ? "s" : ""} ·{" "}
              {getEpisodesBySeries(selectedSeries.id).length} episodes total
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/70 hidden sm:block" />
          <Badge
            variant="outline"
            className="border-primary/40 text-primary bg-primary/10"
          >
            Season {season} · {episodes.length} ep
          </Badge>
        </div>
      )}

      {/* Mobile card layout */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {loading && episodes.length === 0 ? (
          <EmptyCardState message="Loading episodes…" icon={Clapperboard} />
        ) : !seriesId || episodes.length === 0 ? (
          <EmptyCardState message={emptyMessage} icon={Clapperboard} />
        ) : (
          episodes.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.02 }}
              className="rounded-lg border border-border bg-card p-3 space-y-3"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">
                  {e.episodeNumber}
                </span>
                <ThumbImg
                  src={e.thumbnail}
                  alt={e.title}
                  className="w-14 h-8 rounded shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground line-clamp-1">
                    {e.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {e.description || "No description"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                    onClick={() => openEdit(e)}
                    aria-label="Edit episode"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => setDeleteId(e.id)}
                    aria-label="Delete episode"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/40 text-primary bg-primary/10"
                >
                  S{e.season}:E{e.episodeNumber}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {e.duration || "—"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  {formatViews(e.views || 0)}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground/80 w-16">Ep #</TableHead>
              <TableHead className="text-muted-foreground/80 min-w-[220px]">Episode</TableHead>
              <TableHead className="text-muted-foreground/80">Duration</TableHead>
              <TableHead className="text-muted-foreground/80 text-right">Views</TableHead>
              <TableHead className="text-muted-foreground/80 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && episodes.length === 0 ? (
              <EmptyTableState colSpan={5} message="Loading episodes…" />
            ) : !seriesId ? (
              <EmptyTableState colSpan={5} message="Select a series above to view its episodes." />
            ) : episodes.length === 0 ? (
              <EmptyTableState
                colSpan={5}
                message={`No episodes in Season ${season} yet. Click "Add Episode" to create one.`}
              />
            ) : (
              episodes.map((e, i) => (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-border hover:bg-muted/50"
                >
                  <TableCell>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {e.episodeNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <ThumbImg
                        src={e.thumbnail}
                        alt={e.title}
                        className="w-14 h-8 rounded shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground line-clamp-1">
                          {e.title}
                        </p>
                        <p className="text-xs text-muted-foreground/70 line-clamp-1">
                          {e.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.duration || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {formatViews(e.views || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={() => openEdit(e)}
                        aria-label="Edit episode"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => setDeleteId(e.id)}
                        aria-label="Delete episode"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
              <Clapperboard className="w-5 h-5 text-primary" />
              {editing ? "Edit Episode" : "Add Episode"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {selectedSeries
                ? `For ${selectedSeries.title} — Season ${season}`
                : "Select a series first"}
            </DialogDescription>
          </DialogHeader>
          {seriesId && (
            <EpisodeForm
              key={editing?.id || "new"}
              initial={editing || undefined}
              seriesId={seriesId}
              season={season}
              onSubmit={onSubmit}
              onCancel={() => {
                setDialogOpen(false);
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] sm:w-full md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete this episode?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone.
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

/* ----------------------------------------------------------------
   EpisodeForm
----------------------------------------------------------------- */
function EpisodeForm({
  initial,
  seriesId,
  season,
  onSubmit,
  onCancel,
}: {
  initial?: Episode;
  seriesId: string;
  season: number;
  onSubmit: (v: EpisodeFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EpisodeFormValues>({
    defaultValues: {
      seriesId,
      season,
      episodeNumber: initial?.episodeNumber ?? 1,
      title: initial?.title || "",
      description: initial?.description || "",
      thumbnail: initial?.thumbnail || "",
      videoURL: initial?.videoURL || "",
      duration: initial?.duration || "",
    },
  });

  const submit = handleSubmit(async (vals) => {
    await onSubmit(vals);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Season (locked)</Label>
              <Input value={season} disabled className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Episode #</Label>
              <Input
                type="number"
                min="1"
                {...register("episodeNumber", {
                  valueAsNumber: true,
                  min: 1,
                })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Title <span className="text-primary">*</span>
            </Label>
            <Input
              {...register("title", { required: "Title is required" })}
              placeholder={`Episode title`}
              className={inputCls}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Description</Label>
            <Textarea
              {...register("description")}
              rows={3}
              placeholder="Episode synopsis…"
              className={`${inputCls} resize-y`}
            />
          </div>

          <Controller
            control={control}
            name="thumbnail"
            render={({ field }) => (
              <MediaUploadField
                label="Thumbnail URL"
                url={field.value}
                onUrlChange={field.onChange}
                hint="16:9 400×225"
              />
            )}
          />
          <Controller
            control={control}
            name="videoURL"
            render={({ field }) => (
              <MediaUploadField
                label="Video URL"
                url={field.value}
                onUrlChange={field.onChange}
                preview="video"
              />
            )}
          />

          <div className="space-y-2">
            <Label className="text-muted-foreground">Duration</Label>
            <Input
              {...register("duration")}
              placeholder="e.g. 45m"
              className={inputCls}
            />
          </div>

          <input type="hidden" {...register("seriesId")} />
          <input type="hidden" {...register("season", { valueAsNumber: true })} />

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {initial ? "Save changes" : "Create episode"}
        </Button>
      </div>
    </form>
  );
}
