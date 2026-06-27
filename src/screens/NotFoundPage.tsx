"use client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Compass, Clapperboard } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />

      {/* Background floating film strip */}
      <motion.div
        initial={{ opacity: 0, rotate: -8 }}
        animate={{ opacity: 0.06, rotate: -8 }}
        transition={{ duration: 1 }}
        className="absolute -right-20 top-1/3 hidden lg:block"
      >
        <Clapperboard className="w-[400px] h-[400px] text-primary" />
      </motion.div>

      <div className="relative z-10 text-center max-w-xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Link to="/" className="inline-block">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-primary">
              FLIX<span className="text-foreground">NET</span>
            </span>
          </Link>
        </motion.div>

        {/* 404 big */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="relative inline-block mb-2"
        >
          <h1 className="text-[120px] sm:text-[180px] font-black leading-none tracking-tighter bg-gradient-to-b from-foreground via-primary to-primary/50 bg-clip-text text-transparent">
            404
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
        >
          Lost in the content
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-muted-foreground text-base sm:text-lg mb-8 max-w-md mx-auto"
        >
          The page you&apos;re looking for has been removed, renamed, or never existed.
          Let&apos;s get you back to the show.
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-md transition-colors w-full sm:w-auto justify-center"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <Link
            to="/trending"
            className="inline-flex items-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground font-semibold px-6 py-3 rounded-md transition-colors w-full sm:w-auto justify-center"
          >
            <Compass className="w-5 h-5" />
            Explore Trending
          </Link>
        </motion.div>

        {/* Decorative dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="flex items-center justify-center gap-2 mt-12"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
