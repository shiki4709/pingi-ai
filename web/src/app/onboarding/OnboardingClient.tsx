"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

const T = {
  ink: "#1a1a1a",
  sub: "#6b6b6b",
  muted: "#9a9a9a",
  glass: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.45)",
  green: "#2a8a4a",
  greenSoft: "rgba(42,138,74,0.08)",
};

const glassCard: React.CSSProperties = {
  background: T.glass,
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: `1px solid ${T.border}`,
  boxShadow:
    "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
  borderRadius: 16,
  padding: "14px 16px",
};

const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "PingiAIBot";

export default function OnboardingClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) {
          router.replace("/auth");
        } else {
          setUser(data.user);
          // Generate a link code for Telegram pairing
          fetch("/api/link-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.user.id }),
          })
            .then((r) => r.json())
            .then((d) => { if (d.code) setLinkCode(d.code); })
            .catch(() => {});
        }
        setLoading(false);
      });
  }, [router]);

  // Check for Gmail callback success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
    }
  }, []);

  if (loading) return null;

  const handleConnectGmail = () => {
    if (!user) return;
    window.location.href = `/api/auth/gmail?user_id=${user.id}`;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
      }}
    >
      {/* Step indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {["Sign Up", "Connect"].map((label, i) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                background: i === 0 ? T.green : T.ink,
                color: "#fff",
              }}
            >
              {i === 0 ? "\u2713" : 2}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: i === 1 ? 600 : 400,
                color: i === 1 ? T.ink : T.muted,
              }}
            >
              {label}
            </span>
            {i === 0 && (
              <div
                style={{
                  width: 32,
                  height: 1.5,
                  background: `${T.green}40`,
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <h2
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 26,
          fontWeight: 400,
          color: T.ink,
          margin: "0 0 4px",
        }}
      >
        Connect your platforms
      </h2>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>
        Where should Pingi watch?
      </p>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Gmail card */}
        <div
          style={{
            ...glassCard,
            borderColor: gmailConnected ? `${T.green}50` : T.border,
            background: gmailConnected ? T.greenSoft : T.glass,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#EA4335",
              background: "rgba(234,67,53,0.04)",
              border: "1px solid rgba(234,67,53,0.08)",
            }}
          >
            G
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
              Gmail
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              Monitor emails needing reply
            </div>
          </div>
          {gmailConnected ? (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: T.green,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {"\u2713"}
            </div>
          ) : (
            <button
              onClick={handleConnectGmail}
              style={{
                padding: "7px 16px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #1a1a1a, #333)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              Connect
            </button>
          )}
        </div>

        {/* Telegram card */}
        <div
          style={{
            ...glassCard,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#229ED9",
                background: "rgba(34,158,217,0.04)",
                border: "1px solid rgba(34,158,217,0.08)",
              }}
            >
              TG
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                Telegram
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>
                Get notified and approve drafts
              </div>
            </div>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,0.025)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: T.sub,
              lineHeight: 1.6,
            }}
          >
            Open Telegram and search for{" "}
            <span style={{ fontWeight: 600, color: T.ink }}>
              @{BOT_USERNAME}
            </span>
            , then send:
            {linkCode ? (
              <code
                style={{
                  display: "block",
                  marginTop: 8,
                  background: "rgba(0,0,0,0.05)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink,
                  letterSpacing: "0.05em",
                  userSelect: "all",
                }}
              >
                /link {linkCode}
              </code>
            ) : (
              <span style={{ color: T.muted }}> loading code...</span>
            )}
          </div>
        </div>
      </div>

      {/* Done button */}
      <button
        onClick={() => router.push("/")}
        style={{
          marginTop: 28,
          padding: "12px 44px",
          borderRadius: 12,
          border: "none",
          background: "linear-gradient(135deg, #1a1a1a, #333)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}
      >
        Done
      </button>
    </div>
  );
}
