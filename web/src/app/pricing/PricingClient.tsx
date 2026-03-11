"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const T = {
  ink: "#1a1a1a",
  sub: "#6b6b6b",
  muted: "#9a9a9a",
  glass: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.45)",
  green: "#2a8a4a",
  greenSoft: "rgba(42,138,74,0.08)",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const background = `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
  radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`;

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
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        border: `1px solid ${T.border}`,
        boxShadow:
          "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
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
  "Unlimited Gmail accounts",
  "Unlimited X accounts to watch",
  "Unlimited AI-drafted replies",
  "Inbox Agent + Engage Agent",
  "Smart email filtering",
  "Weekly engagement reports",
  "Priority support",
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
      // Not logged in — send to auth first
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
        background,
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
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 800,
              fontFamily: serif,
              color: "#fff",
              background: "linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            }}
          >
            P
          </div>
          <span
            style={{
              fontFamily: serif,
              fontSize: 20,
              fontWeight: 400,
              color: T.ink,
            }}
          >
            Pingi
          </span>
        </Link>
        <Link
          href="/auth"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: T.ink,
            textDecoration: "none",
            padding: "8px 20px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.5)",
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
              border: `1px solid ${T.green}40`,
              background: T.greenSoft,
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
              border: `1px solid ${T.green}40`,
              background: T.greenSoft,
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
            <p style={{ fontSize: 14, fontWeight: 500, color: T.sub, margin: 0 }}>
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
              color: T.ink,
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
              color: T.sub,
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
            border: `1.5px solid ${T.green}40`,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -12,
              right: 20,
              background: T.green,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 12px",
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
              color: T.green,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              margin: "0 0 4px",
            }}
          >
            Pingi Pro
          </p>
          <div
            style={{
              fontFamily: serif,
              fontSize: 40,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 24px",
            }}
          >
            $19
            <span style={{ fontSize: 16, color: T.muted, fontFamily: sans }}>
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
                  color: T.sub,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{ color: T.green, fontSize: 14, fontWeight: 700, flexShrink: 0 }}
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
              background: `linear-gradient(135deg, ${T.green}, #1e7a3a)`,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              fontFamily: sans,
              boxShadow: "0 4px 16px rgba(42,138,74,0.15)",
            }}
          >
            {loading ? "Redirecting..." : "Start 3-day free trial"}
          </button>

          {error && (
            <p
              style={{
                fontSize: 13,
                color: "#c0392b",
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
          No charge for 3 days. Cancel anytime.
          <br />
          Includes both Inbox and Engage agents.
        </p>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          padding: "32px",
          textAlign: "center",
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
                width: 24,
                height: 24,
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                fontFamily: serif,
                color: "#fff",
                background: "#1a1a1a",
              }}
            >
              P
            </div>
            <span style={{ fontSize: 13, color: T.muted }}>Pingi AI</span>
          </div>
          <div
            style={{ display: "flex", gap: 24, fontSize: 13, color: T.muted }}
          >
            <Link href="/auth" style={{ color: T.muted, textDecoration: "none" }}>
              Sign up
            </Link>
            <Link href="/" style={{ color: T.muted, textDecoration: "none" }}>
              Home
            </Link>
          </div>
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
            {new Date().getFullYear()} Pingi AI
          </p>
        </div>
      </footer>
    </div>
  );
}
