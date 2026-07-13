"use client";

import React, { useId } from "react";

export function Sparkline({ data }: { data: number[] }) {
  const gradientId = useId();

  if (data.length < 2) return <div className="h-8 w-full" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate coordinates for the line
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 32 - ((v - min) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `${points} 100,32 0,32`;

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full">
      <defs>
        <linearGradient
          id={`gradient-${gradientId}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1">
          <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand-blue)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gradient Fill under the line */}
      <polygon points={fillPoints} fill={`url(#gradient-${gradientId})`} />

      {/* Main Sparkline */}
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        className="stroke-[var(--brand-blue)]"
      />
    </svg>
  );
}
