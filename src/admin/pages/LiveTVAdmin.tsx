"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Tv,
  Eye,
  Radio,
  Flame,
  ExternalLink,
  Link2,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { saveLiveTV, deleteLiveTV } from "@/services/dataService";
import type { LiveTVChannel } from "@/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
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

const PAGE_SIZE = 10;

export interface LiveTVFormValues {
  name: string;
  description: string;
  logo: string;
  banner: string;
  streamURL: string;
  category: string;
  tags: string; // comma-separated in form, split on submit
  language: string;
  country: string;
  live: boolean;
  featured: boolean;
}

const emptyForm: LiveTVFormValues = {
  name: "",
  description: "",
  logo: "",
  banner: "",
  streamURL: "",
  category: "",
  tags: "",
  language: "",
  country: "",
  live: true,
  featured: false,
};

function toForm(c: LiveTVChannel): LiveTVFormValues {
  return {
    name: c.name,
    description: c.description || "",
    logo: c.logo || "",
    banner: c.banner || "",
    streamURL: c.streamURL || "",
    category: c.category || "",
    tags: (c.tags || []).join(", "),
    language: c.language || "",
    country: c.country || "",
    live: c.live ?? true,
    featured: c.featured ?? false,
  };
}

export default function LiveTVAdmin() {
  const { liveTVs, categories, getCategoryById, loading } = useData();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LiveTVChannel | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<LiveTVFormValues>(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? liveTVs.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q) ||
            (c.language || "").toLowerCase().includes(q) ||
            (c.country || "").toLowerCase().includes(q) ||
            (c.tags || []).some((t) => t.toLowerCase().includes(q))
        )
      : liveTVs;
    return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [liveTVs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (c: LiveTVChannel) => {
    setEditing(c);
    setForm(toForm(c));
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.streamURL.trim()) {
      toast.error("Stream URL is required");
      return;
    }
    setSubmitting(true);
    try {
      const tags = form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await saveLiveTV({
        id: editing?.id,
        name: form.name.trim(),
        description: form.description.trim(),
        logo: form.logo.trim(),
        banner: form.banner.trim(),
        streamURL: form.streamURL.trim(),
        category: form.category,
        tags,
        language: form.language.trim() || undefined,
        country: form.country.trim() || undefined,
        live: form.live,
        featured: form.featured,
      });
      toast.success(editing ? "Channel updated" : "Channel created", {
        description: form.name,
      });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save channel";
      toast.error("Save failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = liveTVs.find((c) => c.id === deleteId);
    try {
      await deleteLiveTV(deleteId);
      toast.success("Channel deleted", { description: target?.name || "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeleteId(null);
    }
  };

  const emptyMessage = search
    ? "No channels match your search."
    : 'No live TV channels yet. Click "Add Channel" to create one.';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Live TV"
        description={`${liveTVs.length} channel${liveTVs.length !== 1 ? "s" : ""} on the platform`}
      >
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4" /> Add Channel
        </Button>
      </AdminPageHeader>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, language, country, tag…"
          className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {loading && liveTVs.length === 0 ? (
          <EmptyCardState message="Loading channels…" icon={Tv} />
        ) : paged.length === 0 ? (
          <EmptyCardState message={emptyMessage} icon={Tv} />
        ) : (
          paged.map((c, i) => {
            const cat = getCategoryById(c.category);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                className="rounded-lg border border-border bg-card p-3 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <ThumbImg
                    src={c.logo || c.banner}
                    alt={c.name}
                    className="w-14 h-14 rounded shrink-0 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground line-clamp-1">
                      {c.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {cat?.name || "Uncategorized"}
                      {c.language ? ` · ${c.language}` : ""}
                      {c.country ? ` · ${c.country}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 line-clamp-1 mt-0.5 break-all">
                      {c.streamURL || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                      onClick={() => openEdit(c)}
                      aria-label="Edit channel"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => setDeleteId(c.id)}
                      aria-label="Delete channel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      c.live
                        ? "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground"
                        : "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    }
                  >
                    {c.live && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    {c.live ? "LIVE" : "OFFLINE"}
                  </span>
                  {c.featured && (
                    <Badge className="bg-amber-500 text-black border-transparent">
                      <Flame className="w-3 h-3" /> Featured
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {formatViews(c.views || 0)}
                  </span>
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
              <TableHead className="text-muted-foreground/80 min-w-[260px]">Channel</TableHead>
              <TableHead className="text-muted-foreground/80">Category</TableHead>
              <TableHead className="text-muted-foreground/80">Language</TableHead>
              <TableHead className="text-muted-foreground/80">Country</TableHead>
              <TableHead className="text-muted-foreground/80">Status</TableHead>
              <TableHead className="text-muted-foreground/80 text-right">Views</TableHead>
              <TableHead className="text-muted-foreground/80 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && liveTVs.length === 0 ? (
              <EmptyTableState colSpan={7} message="Loading channels…" />
            ) : paged.length === 0 ? (
              <EmptyTableState colSpan={7} message={emptyMessage} />
            ) : (
              paged.map((c, i) => {
                const cat = getCategoryById(c.category);
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-border hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[260px]">
                        <ThumbImg
                          src={c.logo || c.banner}
                          alt={c.name}
                          className="w-10 h-10 rounded shrink-0 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground line-clamp-1">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground/70 line-clamp-1 break-all">
                            {c.streamURL || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <Badge variant="outline" className="border-border text-muted-foreground bg-muted">
                          {cat.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.language || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.country || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={
                            c.live
                              ? "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground"
                              : "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          }
                        >
                          {c.live && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                          {c.live ? "LIVE" : "OFFLINE"}
                        </span>
                        {c.featured && (
                          <Badge className="bg-amber-500 text-black border-transparent">
                            <Flame className="w-3 h-3" /> Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
                        {formatViews(c.views || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {c.streamURL && (
                          <a
                            href={c.streamURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            aria-label="Open stream URL"
                            title="Open stream URL"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                          onClick={() => openEdit(c)}
                          aria-label="Edit channel"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setDeleteId(c.id)}
                          aria-label="Delete channel"
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
          if (!o) {
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] sm:w-full md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Tv className="w-5 h-5 text-primary" />
              {editing ? "Edit Channel" : "Add Channel"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {editing
                ? "Update the channel details below."
                : "Add a new live TV channel. Paste a direct stream URL (HLS .m3u8, .mp4) or any embeddable player page (YouTube live, Vimeo, etc.)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tv-name" className="text-muted-foreground">
                Channel Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="tv-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. BBC News"
                required
                className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
              />
            </div>

            {/* Stream URL */}
            <div className="space-y-2">
              <Label htmlFor="tv-stream" className="text-muted-foreground">
                Stream URL <span className="text-primary">*</span>
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  id="tv-stream"
                  value={form.streamURL}
                  onChange={(e) => setForm({ ...form, streamURL: e.target.value })}
                  placeholder="https://example.com/live.m3u8 or YouTube live URL"
                  required
                  className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Supports HLS (.m3u8), DASH (.mpd), direct video (.mp4), or any iframe-embeddable player URL.
              </p>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label htmlFor="tv-logo" className="text-muted-foreground">
                Logo / Poster URL
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  id="tv-logo"
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
              {form.logo && (
                <img
                  src={form.logo}
                  alt="Logo preview"
                  className="w-20 h-20 rounded-md object-cover border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>

            {/* Banner */}
            <div className="space-y-2">
              <Label htmlFor="tv-banner" className="text-muted-foreground">
                Banner URL (optional)
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <Input
                  id="tv-banner"
                  value={form.banner}
                  onChange={(e) => setForm({ ...form, banner: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                  className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="tv-desc" className="text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="tv-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the channel…"
                rows={3}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground/70 resize-none"
              />
            </div>

            {/* Category + Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Category</Label>
                <Select
                  value={form.category || "__none__"}
                  onValueChange={(v) => setForm({ ...form, category: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="__none__" className="focus:bg-accent">Uncategorized</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="focus:bg-accent">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tv-tags" className="text-muted-foreground">
                  Tags <span className="text-[10px] text-muted-foreground/70">(comma-separated)</span>
                </Label>
                <Input
                  id="tv-tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="News, Sports, Entertainment"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            </div>

            {/* Language + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tv-lang" className="text-muted-foreground">Language</Label>
                <Input
                  id="tv-lang"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  placeholder="e.g. English, Hindi, Bengali"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tv-country" className="text-muted-foreground">Country</Label>
                <Input
                  id="tv-country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="e.g. Bangladesh, India, USA"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary" />
                  <div>
                    <Label htmlFor="tv-live" className="text-foreground text-sm cursor-pointer">
                      Currently Live
                    </Label>
                    <p className="text-[10px] text-muted-foreground/70">
                      Show LIVE badge on the channel
                    </p>
                  </div>
                </div>
                <Switch
                  id="tv-live"
                  checked={form.live}
                  onCheckedChange={(v) => setForm({ ...form, live: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <div>
                    <Label htmlFor="tv-featured" className="text-foreground text-sm cursor-pointer">
                      Featured
                    </Label>
                    <p className="text-[10px] text-muted-foreground/70">
                      Highlight on the Live TV page
                    </p>
                  </div>
                </div>
                <Switch
                  id="tv-featured"
                  checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditing(null);
                  setForm(emptyForm);
                }}
                className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submitting ? "Saving…" : editing ? "Save Changes" : "Create Channel"}
              </Button>
            </DialogFooter>
          </form>
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
              Delete this channel?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              This action cannot be undone. The channel and all its data
              (stream URL, logo, view count) will be permanently removed.
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
