"use client";

export function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="h-8 w-full" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 32 - ((v - min) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full">
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        className={isUp ? "stroke-emerald-500" : "stroke-red-500"}
      />
    </svg>
  );
}
