"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const T = {
  bg: "#0A0F1C",
  bgEnd: "#1A0B2E",
  heading: "#F1F5F9",
  body: "#B0BEC5",
  muted: "#8899A6",
  glass: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  borderLight: "rgba(255,255,255,0.08)",
  blue: "#4F46E5",
  purple: "#7C3AED",
  green: "#34D399",
  greenDim: "rgba(52,211,153,0.15)",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: T.glass,
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        border: `1px solid ${T.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "32px 28px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  "X Engage + Inbox Agent",
  "Unlimited accounts to track",
  "AI-drafted replies",
  "Smart email filtering",
  "Telegram delivery",
  "Cancel anytime",
];

export default function PricingClient() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const upgraded = searchParams.get("upgraded") === "true";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) {
          setUserId(data.user.id);
          setUserEmail(data.user.email ?? null);
        }
      });
  }, []);

  async function handleStartTrial() {
    if (!userId || !userEmail) {
      window.location.href = "/auth";
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: userEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[pricing] Checkout error:", data);
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else if (data.upgraded || data.trial_activated) {
        window.location.href = "/dashboard";
      } else {
        setError("No checkout URL returned");
        setLoading(false);
      }
    } catch (e) {
      console.error("[pricing] Fetch error:", e);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: sans,
        background: `linear-gradient(180deg, ${T.bg} 0%, ${T.bgEnd} 50%, ${T.bg} 100%)`,
        color: T.body,
      }}
    >
      {/* ─── Nav ─── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 800,
              color: "#fff",
              background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
              boxShadow: `0 4px 16px ${T.purple}30`,
            }}
          >
            P
          </div>
          <span
            style={{
              fontFamily: serif,
              fontSize: 19,
              color: T.heading,
            }}
          >
            Pingi
          </span>
        </Link>
        <Link
          href="/auth"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: T.body,
            textDecoration: "none",
            padding: "8px 20px",
            borderRadius: 8,
            border: `1px solid ${T.borderLight}`,
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          Sign in
        </Link>
      </nav>

      {/* ─── Content ─── */}
      <section
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "60px 32px 80px",
        }}
      >
        {/* Status banners */}
        {success && (
          <GlassCard
            style={{
              marginBottom: 24,
              padding: "16px 24px",
              border: `1px solid rgba(52,211,153,0.3)`,
              background: T.greenDim,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: T.green, margin: 0 }}>
              Your Pro subscription is active. Welcome aboard.
            </p>
          </GlassCard>
        )}
        {upgraded && (
          <GlassCard
            style={{
              marginBottom: 24,
              padding: "16px 24px",
              border: `1px solid rgba(52,211,153,0.3)`,
              background: T.greenDim,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: T.green, margin: 0 }}>
              You&apos;ve been upgraded to Pro.
            </p>
          </GlassCard>
        )}
        {canceled && (
          <GlassCard
            style={{ marginBottom: 24, padding: "16px 24px", textAlign: "center" }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: T.body, margin: 0 }}>
              Checkout was canceled. You can try again anytime.
            </p>
          </GlassCard>
        )}

        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: serif,
              fontSize: "clamp(32px, 4vw, 44px)",
              fontWeight: 400,
              color: T.heading,
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            One plan. Full access.
          </h1>
          <p
            style={{
              fontSize: 16,
              color: T.body,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Try everything free for 3 days. Then $19/mo.
          </p>
        </div>

        {/* Single Pro card */}
        <GlassCard
          style={{
            border: `1px solid rgba(124,58,237,0.2)`,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -12,
              right: 20,
              background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 14px",
              borderRadius: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            3-day free trial
          </div>

          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#A78BFA",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              margin: "0 0 4px",
            }}
          >
            Pingi Pro
          </p>
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: T.heading,
              margin: "0 0 24px",
            }}
          >
            $19
            <span style={{ fontSize: 16, color: T.muted, fontWeight: 400 }}>
              {" "}/ month
            </span>
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 28px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {FEATURES.map((f) => (
              <li
                key={f}
                style={{
                  fontSize: 14,
                  color: T.body,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{ color: T.green, fontSize: 13, fontWeight: 700, flexShrink: 0 }}
                >
                  &#10003;
                </span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleStartTrial}
            disabled={loading}
            style={{
              display: "block",
              width: "100%",
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              fontFamily: sans,
              boxShadow: `0 4px 24px ${T.purple}35`,
            }}
          >
            {loading ? "Redirecting..." : "Start free trial"}
          </button>

          {error && (
            <p
              style={{
                fontSize: 13,
                color: "#EF4444",
                margin: "12px 0 0",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
        </GlassCard>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: T.muted,
            marginTop: 24,
            lineHeight: 1.5,
          }}
        >
          3 days free. Cancel anytime.
          <br />
          Includes both X Engage and Inbox agents.
        </p>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: `1px solid ${T.borderLight}`,
          padding: "32px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 800,
                color: "#fff",
                background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
              }}
            >
              P
            </div>
            <span style={{ fontSize: 13, color: T.muted }}>Pingi AI</span>
          </div>
          <nav style={{ display: "flex", gap: 24, fontSize: 13 }}>
            <Link href="/auth" style={{ color: T.muted, textDecoration: "none" }}>
              Sign up
            </Link>
            <Link href="/" style={{ color: T.muted, textDecoration: "none" }}>
              Home
            </Link>
          </nav>
          <p style={{ fontSize: 12, color: "#6B7B8D", margin: 0 }}>
            {new Date().getFullYear()} Pingi AI
          </p>
        </div>
      </footer>
    </div>
  );
}
