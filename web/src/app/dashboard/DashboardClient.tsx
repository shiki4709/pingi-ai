"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  tgBlue: "#229ED9",
  red: "#EA4335",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const INBOX_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "pingi_ai_bot";
const ENGAGE_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_X_BOT_USERNAME ?? "pingi_x_bot";

const glassCard: React.CSSProperties = {
  background: T.glass,
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: `1px solid ${T.border}`,
  boxShadow:
    "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
  borderRadius: 16,
  padding: "20px 20px",
};

interface Status {
  inbox_linked: boolean;
  x_linked: boolean;
  gmail_connected: boolean;
}

export default function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({
    inbox_linked: false,
    x_linked: false,
    gmail_connected: false,
  });

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) {
          router.replace("/auth");
        } else {
          setUser(data.user);
          fetch(`/api/telegram-status?userId=${data.user.id}`)
            .then((r) => r.json())
            .then((s) => {
              setStatus({
                inbox_linked: !!s.inbox_linked,
                x_linked: !!s.x_linked,
                gmail_connected: !!s.gmail_connected,
              });
            })
            .catch(() => {});
        }
        setLoading(false);
      });
  }, [router]);

  if (loading) return null;

  const inboxReady = status.gmail_connected && status.inbox_linked;
  const engageReady = status.x_linked;

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: sans,
        background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          maxWidth: 800,
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: T.muted }}>{user?.email}</span>
          <button
            onClick={async () => {
              await getSupabaseBrowser().auth.signOut();
              router.replace("/auth");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: "transparent",
              color: T.sub,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: sans,
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Content */}
      <section
        style={{
          maxWidth: 540,
          margin: "0 auto",
          padding: "40px 32px 80px",
        }}
      >
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(26px, 3.5vw, 34px)",
            fontWeight: 400,
            color: T.ink,
            margin: "0 0 8px",
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: 15,
            color: T.sub,
            margin: "0 0 32px",
            lineHeight: 1.6,
          }}
        >
          {inboxReady || engageReady
            ? "Your agents are running. Open Telegram to review drafts and engage."
            : "Connect your agents to get started."}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Inbox Agent card */}
          <div
            style={{
              ...glassCard,
              borderColor: inboxReady ? `${T.green}50` : T.border,
              background: inboxReady ? T.greenSoft : T.glass,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: inboxReady ? 12 : 0 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: inboxReady ? T.green : T.red,
                  background: inboxReady
                    ? T.greenSoft
                    : "rgba(234,67,53,0.04)",
                  border: `1px solid ${inboxReady ? `${T.green}20` : "rgba(234,67,53,0.08)"}`,
                  flexShrink: 0,
                }}
              >
                {inboxReady ? "\u2713" : "G"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>
                  Inbox Agent
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: inboxReady ? T.green : T.muted,
                    marginTop: 2,
                  }}
                >
                  {inboxReady
                    ? "Monitoring your inbox"
                    : !status.gmail_connected
                      ? "Gmail not connected"
                      : "Telegram not linked"}
                </div>
              </div>
              {inboxReady ? (
                <a
                  href={`https://t.me/${INBOX_BOT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.04)",
                    color: T.sub,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: sans,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open bot
                </a>
              ) : (
                <button
                  onClick={() => router.push("/onboarding")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #1a1a1a, #333)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: sans,
                    whiteSpace: "nowrap",
                  }}
                >
                  Set up
                </button>
              )}
            </div>

            {inboxReady && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  borderTop: `1px solid ${T.green}20`,
                  paddingTop: 12,
                }}
              >
                <StatusPill label="Gmail" connected />
                <StatusPill label="Telegram" connected />
              </div>
            )}
          </div>

          {/* Engage Agent card */}
          <div
            style={{
              ...glassCard,
              borderColor: engageReady ? `${T.green}50` : T.border,
              background: engageReady ? T.greenSoft : T.glass,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: engageReady ? 12 : 0 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: engageReady ? T.green : T.ink,
                  background: engageReady ? T.greenSoft : "rgba(0,0,0,0.04)",
                  border: `1px solid ${engageReady ? `${T.green}20` : "rgba(0,0,0,0.06)"}`,
                  flexShrink: 0,
                }}
              >
                {engageReady ? "\u2713" : "X"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>
                  Engage Agent
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: engageReady ? T.green : T.muted,
                    marginTop: 2,
                  }}
                >
                  {engageReady
                    ? "Scanning for engagement opportunities"
                    : "Not connected"}
                </div>
              </div>
              {engageReady ? (
                <a
                  href={`https://t.me/${ENGAGE_BOT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.04)",
                    color: T.sub,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: sans,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open bot
                </a>
              ) : (
                <button
                  onClick={() => router.push("/onboarding")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #1a1a1a, #333)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: sans,
                    whiteSpace: "nowrap",
                  }}
                >
                  Set up
                </button>
              )}
            </div>

            {engageReady && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  borderTop: `1px solid ${T.green}20`,
                  paddingTop: 12,
                }}
              >
                <StatusPill label="Telegram" connected />
                <StatusPill label="Scanning every 30 min" connected />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        color: connected ? T.green : T.muted,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: connected ? T.green : T.muted,
        }}
      />
      {label}
    </div>
  );
}
