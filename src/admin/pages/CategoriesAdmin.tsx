"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  LayoutGrid,
  Film,
  Tv,
  Loader2,
  Flame,
  Drama,
  Laugh,
  Rocket,
  Ghost,
  Heart,
  Zap,
  BookOpen,
  Music,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { saveCategory, deleteCategory } from "@/services/dataService";
import type { Category } from "@/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { AdminPageHeader } from "@/admin/components/AdminShared";

const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Flame", Icon: Flame },
  { name: "Drama", Icon: Drama },
  { name: "Laugh", Icon: Laugh },
  { name: "Rocket", Icon: Rocket },
  { name: "Ghost", Icon: Ghost },
  { name: "Heart", Icon: Heart },
  { name: "Zap", Icon: Zap },
  { name: "BookOpen", Icon: BookOpen },
  { name: "Film", Icon: Film },
  { name: "Tv", Icon: Tv },
  { name: "Music", Icon: Music },
  { name: "Gamepad2", Icon: Gamepad2 },
];

function getIcon(name?: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.name === name)?.Icon || LayoutGrid;
}

interface CategoryFormValues {
  name: string;
  description: string;
  icon: string;
}

const inputCls = "bg-background border-border text-foreground placeholder:text-muted-foreground/70";

export default function CategoriesAdmin() {
  const { categories, movies, series, loading } = useData();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const countFor = (id: string) =>
    movies.filter((m) => m.category === id).length +
    series.filter((s) => s.category === id).length;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const onSubmit = async (vals: CategoryFormValues) => {
    try {
      await saveCategory({
        id: editing?.id,
        name: vals.name,
        description: vals.description,
        icon: vals.icon,
      });
      toast.success(editing ? "Category updated" : "Category created", {
        description: vals.name,
      });
      setDialogOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save category";
      toast.error("Save failed", { description: msg });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = categories.find((c) => c.id === deleteId);
    try {
      await deleteCategory(deleteId);
      toast.success("Category deleted", {
        description: target?.name || "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error("Delete failed", { description: msg });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categories"
        description={`${categories.length} categories on the platform`}
      >
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </AdminPageHeader>

      {loading && categories.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card border-border h-32 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card className="bg-card border-border text-foreground">
          <CardContent className="py-12 text-center">
            <LayoutGrid className="w-10 h-10 mx-auto text-muted-foreground/70 mb-3" />
            <p className="text-sm text-muted-foreground/80">
              No categories yet. Click "Add Category" to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((c, i) => {
            const Icon = getIcon(c.icon);
            const count = countFor(c.id);
            const moviesCount = movies.filter((m) => m.category === c.id).length;
            const seriesCount = series.filter((s) => s.category === c.id).length;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="bg-card border-border text-foreground hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                          onClick={() => openEdit(c)}
                          aria-label="Edit category"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setDeleteId(c.id)}
                          aria-label="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-base">{c.name}</h3>
                    {c.description && (
                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <Badge
                        variant="outline"
                        className="border-border text-muted-foreground bg-muted"
                      >
                        <Film className="w-3 h-3" /> {moviesCount} movie
                        {moviesCount === 1 ? "" : "s"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-border text-muted-foreground bg-muted"
                      >
                        <Tv className="w-3 h-3" /> {seriesCount} series
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-2">
                      Total content: {count}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] sm:w-full md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <LayoutGrid className="w-5 h-5 text-primary" />
              {editing ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {editing
                ? "Update category details."
                : "Create a new category for content organization."}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            key={editing?.id || "new"}
            initial={editing || undefined}
            onSubmit={onSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] sm:w-full md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete this category?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/80">
              Movies and series using this category will keep their reference
              but will display as "—" until reassigned.
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

function CategoryForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Category;
  onSubmit: (v: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      name: initial?.name || "",
      description: initial?.description || "",
      icon: initial?.icon || "Flame",
    },
  });

  const submit = handleSubmit(async (vals) => {
    await onSubmit(vals);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-muted-foreground">
          Name <span className="text-primary">*</span>
        </Label>
        <Input
          {...register("name", { required: "Name is required" })}
          placeholder="e.g. Action"
          className={inputCls}
        />
        {errors.name && (
          <p className="text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Description</Label>
        <Textarea
          {...register("description")}
          rows={2}
          placeholder="Short description…"
          className={`${inputCls} resize-y`}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">Icon</Label>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={`w-full ${inputCls}`}>
                <SelectValue placeholder="Select an icon" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                {ICON_OPTIONS.map(({ name, Icon }) => (
                  <SelectItem key={name} value={name}>
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" /> {name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-[10px] text-muted-foreground/70">
          Preview of available icons. Selected icon will display on category
          cards and filters.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {initial ? "Save changes" : "Create"}
        </Button>
      </div>
    </form>
  );
}
