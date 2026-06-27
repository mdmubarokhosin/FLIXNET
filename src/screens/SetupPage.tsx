"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Database, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { isDatabaseSetup, seedDatabase } from "@/services/dataService";
import { createAdminAccount } from "@/services/authService";

const ADMIN_EMAIL = "contact.mdmubarok@gmail.com";
const ADMIN_PASSWORD = "1$84#mubarok";

type SetupStep = "checking" | "ready" | "creating-admin" | "seeding" | "complete" | "error" | "already-setup";

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SetupStep>("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    checkSetup();
  }, []);

  async function checkSetup() {
    setStep("checking");
    try {
      const setup = await isDatabaseSetup();
      if (setup) {
        setStep("already-setup");
        setTimeout(() => navigate("/", { replace: true }), 2000);
      } else {
        setStep("ready");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to check database status");
      setStep("error");
    }
  }

  async function runSetup() {
    try {
      // Step 1: Create admin account
      setStep("creating-admin");
      setProgress("Creating admin account...");
      await createAdminAccount(ADMIN_EMAIL, ADMIN_PASSWORD, "Admin");
      toast.success("Admin account created");

      // Step 2: Seed database
      setStep("seeding");
      setProgress("Seeding database with sample content...");
      await seedDatabase();
      toast.success("Database seeded successfully");

      // Step 3: Complete
      setStep("complete");
      setProgress("Setup complete! Redirecting...");
      setTimeout(() => navigate("/", { replace: true }), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed";
      setErrorMsg(msg);
      setStep("error");
      toast.error("Setup failed", { description: msg });
    }
  }

  const stepInfo: Record<SetupStep, { icon: React.ReactNode; title: string; desc: string }> = {
    checking: {
      icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
      title: "Checking Database",
      desc: "Verifying if setup is needed...",
    },
    ready: {
      icon: <Database className="w-8 h-8 text-primary" />,
      title: "Database Setup Required",
      desc: "Your database is empty. Click the button below to set up the platform automatically.",
    },
    "creating-admin": {
      icon: <Shield className="w-8 h-8 text-primary animate-pulse" />,
      title: "Creating Admin Account",
      desc: progress,
    },
    seeding: {
      icon: <Sparkles className="w-8 h-8 text-primary animate-pulse" />,
      title: "Seeding Database",
      desc: progress,
    },
    complete: {
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
      title: "Setup Complete!",
      desc: "Your FLIXNET platform is ready. Redirecting to home page...",
    },
    error: {
      icon: <AlertCircle className="w-8 h-8 text-red-500" />,
      title: "Setup Failed",
      desc: errorMsg,
    },
    "already-setup": {
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
      title: "Already Set Up",
      desc: "The database has already been configured. Redirecting to home page...",
    },
  };

  const current = stepInfo[step];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-primary">
            FLIX<span className="text-foreground">NET</span>
          </span>
          <p className="text-muted-foreground text-sm mt-2">Initial Setup</p>
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-border shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3">{current.icon}</div>
            <CardTitle className="text-xl text-foreground">{current.title}</CardTitle>
            <CardDescription className="text-muted-foreground">{current.desc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {step === "ready" && (
              <>
                <div className="space-y-3 mb-6 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                  <p className="font-medium text-foreground">This will create:</p>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Admin account: <code className="text-foreground bg-muted px-1 rounded">{ADMIN_EMAIL}</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    <span>Sample categories, movies, and series</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Default platform settings</span>
                  </div>
                </div>
                <Button
                  onClick={runSetup}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Setup
                </Button>
              </>
            )}

            {step === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{errorMsg}</p>
                <Button
                  onClick={runSetup}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Retry Setup
                </Button>
                <Button
                  onClick={checkSetup}
                  variant="outline"
                  className="w-full bg-background border-border text-foreground hover:bg-accent"
                >
                  Check Again
                </Button>
              </div>
            )}

            {(step === "creating-admin" || step === "seeding") && (
              <div className="w-full bg-muted rounded-full h-2 mt-4">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: step === "creating-admin" ? "30%" : "70%" }}
                  animate={{ width: step === "creating-admin" ? "50%" : "90%" }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
