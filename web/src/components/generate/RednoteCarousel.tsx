"use client";

import { useState } from "react";

interface Slide {
  id: string;
  content: string;
  imageUrl?: string;
}

interface RednoteCarouselProps {
  slides: Slide[];
}

export default function RednoteCarousel({ slides }: RednoteCarouselProps) {
  const [current, setCurrent] = useState(0);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const hasPrev = current > 0;
  const hasNext = current < slides.length - 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Slide area */}
      <div
        className="rounded-2xl p-5 min-h-[200px] flex flex-col justify-between"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow:
            "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
        }}
      >
        {slide.imageUrl && (
          <img
            src={slide.imageUrl}
            alt=""
            className="w-full rounded-xl mb-3 object-cover max-h-[300px]"
          />
        )}
        <p className="text-sm text-[#1a1a1a] leading-relaxed whitespace-pre-wrap">
          {slide.content}
        </p>
      </div>

      {/* Navigation dots + arrows */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => hasPrev && setCurrent((c) => c - 1)}
          disabled={!hasPrev}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
          style={{
            background: hasPrev ? "rgba(0,0,0,0.06)" : "transparent",
            color: hasPrev ? "#1a1a1a" : "#9a9a9a",
            cursor: hasPrev ? "pointer" : "default",
          }}
        >
          &lt;
        </button>

        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background:
                  i === current ? "#FF2442" : "rgba(0,0,0,0.12)",
                transform: i === current ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <button
          onClick={() => hasNext && setCurrent((c) => c + 1)}
          disabled={!hasNext}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
          style={{
            background: hasNext ? "rgba(0,0,0,0.06)" : "transparent",
            color: hasNext ? "#1a1a1a" : "#9a9a9a",
            cursor: hasNext ? "pointer" : "default",
          }}
        >
          &gt;
        </button>
      </div>

      {/* Slide counter */}
      <div className="text-center text-[10px] text-[#9a9a9a]">
        {current + 1} / {slides.length}
      </div>
    </div>
  );
}
