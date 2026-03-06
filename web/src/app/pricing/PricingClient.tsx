"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const glassCard = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255,255,255,0.45)",
  boxShadow:
    "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
} as const;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "1 connected platform",
      "10 AI drafts per month",
      "Daily digest notifications",
      "Basic urgency scoring",
    ],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: [
      "All platforms (Gmail, X, LinkedIn)",
      "Unlimited AI drafts",
      "Weekly performance reports",
      "Priority urgency alerts",
      "Custom tone profiles",
      "Publish directly from dashboard",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
] as const;

export default function PricingClient() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user",
          email: "user@example.com",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 h-[54px]"
        style={glassCard}
      >
        <a href="/" className="flex items-center gap-2 no-underline">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              background: "linear-gradient(135deg, #1a1a1a, #333)",
            }}
          >
            P
          </div>
          <span
            className="text-lg text-[#1a1a1a]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Pingi
          </span>
        </a>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-[900px] w-full mx-auto px-4 py-12">
        {/* Status banners */}
        {success && (
          <div
            className="mb-8 px-5 py-3 rounded-2xl text-sm font-medium text-[#1a1a1a]"
            style={{
              ...glassCard,
              borderColor: "#2a8a4a",
              background: "rgba(42,138,74,0.08)",
            }}
          >
            Your Pro subscription is active. Welcome aboard.
          </div>
        )}
        {canceled && (
          <div
            className="mb-8 px-5 py-3 rounded-2xl text-sm font-medium text-[#6b6b6b]"
            style={glassCard}
          >
            Checkout was canceled. You can try again anytime.
          </div>
        )}

        {/* Heading */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl text-[#1a1a1a] mb-3"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Simple, transparent pricing
          </h1>
          <p className="text-sm text-[#6b6b6b] max-w-md mx-auto leading-relaxed">
            Start free with one platform. Upgrade when you need full coverage
            and unlimited AI drafts across all your channels.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                ...glassCard,
                ...(tier.highlight
                  ? {
                      border: "1.5px solid rgba(42,138,74,0.3)",
                      boxShadow:
                        "0 4px 24px rgba(42,138,74,0.08), 0 0.5px 0 rgba(255,255,255,0.6) inset",
                    }
                  : {}),
              }}
            >
              {tier.highlight && (
                <span
                  className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md mb-4"
                  style={{
                    background: "rgba(42,138,74,0.1)",
                    color: "#2a8a4a",
                  }}
                >
                  Recommended
                </span>
              )}

              <h2
                className="text-2xl text-[#1a1a1a] mb-1"
                style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                {tier.name}
              </h2>

              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-semibold text-[#1a1a1a]">
                  {tier.price}
                </span>
                <span className="text-sm text-[#9a9a9a]">{tier.period}</span>
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-[#1a1a1a] leading-snug"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0 mt-0.5"
                    >
                      <path
                        d="M4 8.5L6.5 11L12 5"
                        stroke={tier.highlight ? "#2a8a4a" : "#9a9a9a"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={tier.highlight ? handleUpgrade : undefined}
                disabled={tier.highlight && loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  cursor: tier.highlight && loading ? "wait" : "pointer",
                  ...(tier.highlight
                    ? {
                        background: "linear-gradient(135deg, #1a1a1a, #333)",
                        color: "#ffffff",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      }
                    : {
                        background: "rgba(0,0,0,0.04)",
                        color: "#1a1a1a",
                        border: "1px solid rgba(0,0,0,0.08)",
                      }),
                }}
              >
                {tier.highlight && loading ? "Redirecting..." : tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
