"use client";
import * as React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  FileText,
  Eye,
  Database,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPage() {
  const { user } = useAuth();

  return (
    <div className="pb-12">
      <PageHeader
        title="Privacy & Data"
        subtitle="Your data, your control"
        icon={<Shield className="w-7 h-7" />}
      />

      <div className="px-4 sm:px-6 lg:px-12 space-y-6 max-w-4xl">
        {/* Your rights */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Your Privacy Rights
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              Under GDPR and similar regulations, you have the right to access
              and delete your personal data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground/90">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p>
                <strong className="text-foreground">Right of access.</strong>{" "}
                You may request a copy of all personal data FLIXNET holds about you.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p>
                <strong className="text-foreground">Right to erasure.</strong>{" "}
                You may request that all your personal data be deleted from our systems.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p>
                <strong className="text-foreground">Data portability.</strong>{" "}
                You may receive your data in a machine-readable format.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What we collect */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> What We Store
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              A list of the data we keep for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Profile", desc: "Display name, email, photo, role", icon: FileText },
                { label: "Watch History", desc: "Movies & episodes you've started watching", icon: Eye },
                { label: "My List", desc: "Content you've saved for later", icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Contact for data requests */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Data Requests
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              How to exercise your privacy rights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground/90">
            <p>
              To export or delete your personal data, please contact us at{" "}
              <a
                href="mailto:privacy@flixnet.com"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                privacy@flixnet.com
                <ChevronRight className="w-3 h-3" />
              </a>
              . We will respond to your request within 30 days as required by applicable law.
            </p>
            {!user && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90">
                You need to be signed in to submit data requests.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy policy summary */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Privacy Policy Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground/90">
            <p>
              <strong className="text-foreground">What we collect:</strong> We
              collect only the data needed to provide the streaming service —
              your email, display name, and watch activity.
            </p>
            <p>
              <strong className="text-foreground">How we use it:</strong> To
              personalize your experience and improve our content recommendations.
            </p>
            <p>
              <strong className="text-foreground">Third parties:</strong> We use
              Firebase (Google) for authentication and data storage. These
              providers have their own privacy policies.
            </p>
            <p>
              <strong className="text-foreground">Data retention:</strong> We
              keep your data for as long as your account is active.
            </p>
            <p>
              <strong className="text-foreground">Contact:</strong> For privacy
              requests, email{" "}
              <a
                href="mailto:privacy@flixnet.com"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                privacy@flixnet.com
                <ChevronRight className="w-3 h-3" />
              </a>
              .
            </p>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center"
        >
          <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
            <Shield className="w-2.5 h-2.5 mr-1" />
            GDPR-compliant • Last updated {new Date().toISOString().slice(0, 10)}
          </Badge>
        </motion.div>
      </div>
    </div>
  );
}
