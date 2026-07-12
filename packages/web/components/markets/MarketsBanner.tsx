"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type BannerSlide = {
  title: string;
  subtitle: string;
  image: string;
};

export function MarketsBanner({ slides }: { slides: BannerSlide[] }) {
  const [active, setActive] = useState(0);
  const go = (delta: number) =>
    setActive((i) => (i + delta + slides.length) % slides.length);

  const slide = slides[active];
  if (!slide) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative flex min-h-[220px] items-center justify-between gap-6 px-8 py-10 sm:px-10">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {slide.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {slide.subtitle}
          </p>
        </div>

        <div className="relative hidden h-40 w-40 shrink-0 sm:block">
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-contain"
            priority={active === 0}
          />
        </div>
      </div>

      <button
        onClick={() => go(-1)}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/60 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/60 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground">
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === active
                ? "w-5 bg-foreground"
                : "w-1.5 bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
