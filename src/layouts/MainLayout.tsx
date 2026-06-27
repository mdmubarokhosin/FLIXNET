"use client";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import PageTransition from "@/components/shared/PageTransition";
import SkipLink from "@/components/shared/SkipLink";

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SkipLink targetId="main-content" />
      <Navbar />
      <main id="main-content" className="flex-1 pt-16" tabIndex={-1}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}
