"use client";

import Image from "next/image";

export function Banner({
  image,
  title,
  subtitle,
}: {
  image: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative h-[180px] w-full overflow-hidden rounded-md border border-border">
      <Image src={image} alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="relative flex h-full max-w-md flex-col justify-center px-8">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/70">{subtitle}</p>
      </div>
    </div>
  );
}
