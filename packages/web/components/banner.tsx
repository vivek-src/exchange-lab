"use client";

import { ArrowRight } from "lucide-react";
import { BadgeIndianRupee } from "lucide-react";
import React from "react";

interface BannerProps {
  title: React.ReactNode;
  subtitle: string;
  buttonText?: string;
  onClick?: () => void;
  rightGraphic?: React.ReactNode;
}

export function Banner({
  title,
  subtitle,
  buttonText = "Claim Bonus",
  onClick,
  rightGraphic,
}: BannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* subtle glow */}
      <div className="pointer-events-none absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex items-center justify-between gap-12 px-8 py-8 lg:px-10 lg:py-10">
        {/* Left */}
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground lg:text-4xl">
            {title}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground lg:text-base">
            {subtitle}
          </p>

          {onClick && (
            <button
              onClick={onClick}
              className="group mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-cyan)] px-5 text-sm font-semibold text-black transition hover:bg-[var(--brand-blue)]">
              {buttonText}

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        {/* Right */}
        {rightGraphic && (
          <div className="hidden lg:flex lg:items-center lg:justify-center">
            {rightGraphic}
          </div>
        )}
      </div>
    </section>
  );
}
export function CoinDropIllustration() {
  return (
    <div className="relative flex h-52 w-52 items-center justify-center">
      {/* Background Glow */}
      <div className="absolute h-52 w-52 rounded-full bg-[var(--brand-blue)]/20 blur-3xl" />

      {/* Decorative Rings */}
      <div className="absolute h-72 w-72 rotate-6 rounded-[38%] border border-[var(--brand-blue)]/15" />

      <div className="absolute h-60 w-60 -rotate-12 rounded-[38%] border border-[var(--brand-cyan)]/15" />

      <div className="absolute h-48 w-48 rotate-[18deg] rounded-[38%] border border-[var(--brand-blue)]/10" />

      {/* Main Coin */}
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-8 ring-[var(--brand-cyan)]/10">
        <BadgeIndianRupee className="h-10 w-10 text-zinc-900" />
      </div>

      {/* Small Coins */}
      <div className="absolute left-7 top-10 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 shadow">
        <BadgeIndianRupee className="h-4 w-4 text-zinc-900" />
      </div>

      <div className="absolute bottom-9 right-10 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-200 shadow">
        <BadgeIndianRupee className="h-3 w-3 text-zinc-900" />
      </div>

      {/* Accent Dots */}
      <div className="absolute left-12 bottom-10 h-1.5 w-1.5 rounded-full bg-[var(--brand-cyan)]" />

      <div className="absolute right-16 bottom-16 h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />

      <div className="absolute top-16 left-20 h-1 w-1 rounded-full bg-yellow-300" />
    </div>
  );
}
