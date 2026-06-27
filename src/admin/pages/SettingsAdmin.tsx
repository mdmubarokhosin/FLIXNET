"use client";
import * as React from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Eye,
  EyeOff,
  Palette,
  Globe,
  Sliders,
  Clapperboard,
  ExternalLink,
  Database,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useData } from "@/context/DataContext";
import { seedDatabase, clearAllContent } from "@/services/dataService";
import type { Settings } from "@/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AdminPageHeader, MediaUploadField } from "@/admin/components/AdminShared";

const inputCls = "bg-background border-border text-foreground placeholder:text-muted-foreground/70";

interface SettingsFormValues {
  siteName: string;
  logo: string;
  primaryColor: string;
  backgroundColor: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  heroAutoplay: boolean;
  heroInterval: number;
  tmdbApiKey: string;
}

export default function SettingsAdmin() {
  const { settings, update, loading } = useSettings();
  const { refresh } = useData();
  const [seeding, setSeeding] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, dirtyFields },
  } = useForm<SettingsFormValues>({
    defaultValues: settings,
  });

  React.useEffect(() => {
    if (!loading) reset(settings);
  }, [loading, settings, reset]);

  // Live preview values
  const previewSiteName = useWatch({ control, name: "siteName" }) || "FLIXNET";
  const previewPrimary = useWatch({ control, name: "primaryColor" }) || "#e50914";
  const previewBg = useWatch({ control, name: "backgroundColor" }) || "#0f0f0f";
  const previewLogo = useWatch({ control, name: "logo" });

  const onSubmit = async (vals: SettingsFormValues) => {
    try {
      await update(vals as Partial<Settings>);
      toast.success("Settings saved", {
        description: "Site settings have been updated successfully.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      toast.error("Save failed", { description: msg });
    }
  };

  const [showTmdbKey, setShowTmdbKey] = React.useState(false);

  // ---- Data management ----
  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
      toast.success("Database seeded", {
        description: "Sample categories, movies, series, and episodes have been added.",
      });
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Seeding failed";
      toast.error("Seed failed", { description: msg });
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearAllContent();
      toast.success("All content cleared", {
        description: "Movies, series, episodes, categories, and Live TV channels have been removed. Settings reset to defaults.",
      });
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Clear failed";
      toast.error("Clear failed", { description: msg });
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Configure your FLIXNET platform"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Branding ─── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Palette className="w-5 h-5 text-primary" /> Branding
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize the look and feel of your streaming platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Site Name</Label>
                <Input
                  {...register("siteName")}
                  placeholder="FLIXNET"
                  className={inputCls}
                />
              </div>
              <MediaUploadField
                label="Logo URL"
                url={previewLogo || ""}
                onUrlChange={(url) =>
                  reset((prev) => ({ ...prev, logo: url }) as SettingsFormValues)
                }
                hint="square, transparent PNG preferred"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    {...register("primaryColor")}
                    className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    {...register("primaryColor")}
                    placeholder="#e50914"
                    className={`${inputCls} flex-1`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    {...register("backgroundColor")}
                    className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    {...register("backgroundColor")}
                    placeholder="#0f0f0f"
                    className={`${inputCls} flex-1`}
                  />
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
              <div
                className="rounded-lg p-4 flex items-center gap-3"
                style={{ backgroundColor: previewBg }}
              >
                {previewLogo && (
                  <img src={previewLogo} alt="Logo" className="h-8 w-8 rounded object-cover" />
                )}
                <span
                  className="text-xl font-extrabold tracking-tight"
                  style={{ color: previewPrimary }}
                >
                  {previewSiteName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── SEO ─── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Globe className="w-5 h-5 text-primary" /> SEO & Meta
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure how your site appears in search engines and social media
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">SEO Title</Label>
              <Input
                {...register("seoTitle")}
                placeholder="FLIXNET - Watch Movies & TV Shows Online"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">SEO Description</Label>
              <Textarea
                {...register("seoDescription")}
                rows={3}
                className={`${inputCls} resize-y`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">SEO Keywords</Label>
              <Input
                {...register("seoKeywords")}
                placeholder="movies, tv shows, streaming"
                className={inputCls}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Hero ─── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sliders className="w-5 h-5 text-primary" /> Hero Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Control the homepage hero slider behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={control}
              name="heroAutoplay"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3 cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-foreground">Autoplay</span>
                    <p className="text-xs text-muted-foreground">Automatically cycle through featured content</p>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
            <div className="space-y-2">
              <Label className="text-muted-foreground">Autoplay Interval (ms)</Label>
              <Input
                type="number"
                min={2000}
                max={30000}
                step={500}
                {...register("heroInterval", { valueAsNumber: true })}
                className={inputCls}
              />
              <p className="text-[10px] text-muted-foreground/70">
                Time between hero slides in milliseconds (2000–30000)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── TMDB Integration ─── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clapperboard className="w-5 h-5 text-primary" /> TMDB Integration
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enable auto-fill from The Movie Database when adding movies/series
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">TMDB API Key</Label>
                <a
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Get API key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showTmdbKey ? "text" : "password"}
                  {...register("tmdbApiKey")}
                  placeholder="Paste your TMDB API key here"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowTmdbKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showTmdbKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Used by the auto-fill feature in Movies/Series admin forms to fetch metadata from TMDB.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Data Management ─── */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Database className="w-5 h-5 text-primary" /> Data Management
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Seed sample data or clear all content from the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={handleSeed}
                disabled={seeding}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {seeding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Seed Sample Data
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={clearing}
                    className="bg-background border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    {clearing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Clear All Content
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">
                      Clear all content?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This will permanently delete all movies, series, episodes, categories, and Live TV channels from the database. Settings will be reset to defaults. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-accent hover:text-foreground">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClear}
                      className="bg-red-600 hover:bg-red-700 text-white border-transparent"
                    >
                      Yes, clear everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Seed adds sample categories, movies, and series. Clear removes all content but keeps user accounts.
            </p>
          </CardContent>
        </Card>

        {/* ─── Save Button ─── */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
