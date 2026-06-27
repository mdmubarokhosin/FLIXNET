"use client";
export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="flex items-center gap-1 animate-pulse">
        <span className="text-primary text-4xl font-extrabold tracking-widest">FLIX</span>
        <span className="text-foreground text-4xl font-extrabold tracking-widest">NET</span>
      </div>
      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary animate-[shimmer_1.2s_infinite] w-1/3" />
      </div>
      <p className="text-muted-foreground text-sm">Loading your entertainment…</p>
    </div>
  );
}
