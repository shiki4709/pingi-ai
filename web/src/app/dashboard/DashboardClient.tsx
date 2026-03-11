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
  amber: "#D97706",
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

interface ActivityItem {
  id: string;
  type: "inbox" | "engage";
  author: string;
  subject: string;
  status: string;
  urgency?: string;
  time: string;
}

interface DashboardData {
  inbox_linked: boolean;
  x_linked: boolean;
  gmail_connected: boolean;
  gmail_email: string | null;
  name: string | null;
  plan: string;
  trial_ends_at: string | null;
  pending_count: number;
  inbox_pending: number;
  engage_pending: number;
  actioned_this_week: number;
  reviewed_this_week: number;
  response_rate: number | null;
  watched_accounts: string[];
  search_topics: string[];
  engage_posted_week: number;
  recent_inbox: ActivityItem[];
  recent_engage: ActivityItem[];
}

export default function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data: authData }) => {
        if (!authData.user) {
          router.replace("/auth");
          return;
        }
        setUser(authData.user);
        fetch(`/api/dashboard-stats?userId=${authData.user.id}`)
          .then((r) => r.json())
          .then((d) => setData(d))
          .catch(() => {});
        setLoading(false);
      });
  }, [router]);

  if (loading || !data) return null;

  const inboxReady = data.gmail_connected && data.inbox_linked;
  const engageReady = data.x_linked;
  const hasAnyAgent = inboxReady || engageReady;

  const greeting = getGreeting(data.name || user?.user_metadata?.full_name || null);

  // Merge and sort recent activity
  const recentActivity = [...data.recent_inbox, ...data.recent_engage]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PlanBadge plan={data.plan} trialEndsAt={data.trial_ends_at} />
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
          maxWidth: 640,
          margin: "0 auto",
          padding: "24px 32px 80px",
        }}
      >
        {/* Greeting */}
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(26px, 3.5vw, 34px)",
            fontWeight: 400,
            color: T.ink,
            margin: "0 0 4px",
          }}
        >
          {greeting}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: T.sub,
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          {hasAnyAgent
            ? data.pending_count > 0
              ? `You have ${data.pending_count} item${data.pending_count !== 1 ? "s" : ""} waiting for review.`
              : "All caught up. Your agents are running."
            : "Connect your agents to get started."}
        </p>

        {/* Stats row */}
        {hasAnyAgent && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <StatCard
              label="Pending"
              value={data.pending_count}
              color={data.pending_count > 0 ? T.amber : T.green}
            />
            <StatCard
              label="Actioned this week"
              value={data.actioned_this_week}
              color={T.ink}
            />
            <StatCard
              label="Action rate"
              value={data.response_rate !== null ? `${data.response_rate}%` : "--"}
              color={T.ink}
            />
          </div>
        )}

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: inboxReady ? 12 : 0,
              }}
            >
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
                    ? data.inbox_pending > 0
                      ? `${data.inbox_pending} email${data.inbox_pending !== 1 ? "s" : ""} pending review`
                      : "Monitoring your inbox"
                    : !data.gmail_connected
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
                <StatusPill
                  label={data.gmail_email ?? "Gmail"}
                  connected
                />
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: engageReady ? 12 : 0,
              }}
            >
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
                  background: engageReady
                    ? T.greenSoft
                    : "rgba(0,0,0,0.04)",
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
                    ? data.engage_pending > 0
                      ? `${data.engage_pending} tweet${data.engage_pending !== 1 ? "s" : ""} pending review`
                      : "Scanning for opportunities"
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
                  flexDirection: "column",
                  gap: 10,
                  borderTop: `1px solid ${T.green}20`,
                  paddingTop: 12,
                }}
              >
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatusPill label="Telegram" connected />
                  <StatusPill
                    label={`${data.watched_accounts.length} account${data.watched_accounts.length !== 1 ? "s" : ""} watched`}
                    connected
                  />
                  {data.search_topics.length > 0 && (
                    <StatusPill
                      label={`${data.search_topics.length} topic${data.search_topics.length !== 1 ? "s" : ""} tracked`}
                      connected
                    />
                  )}
                </div>
                {data.watched_accounts.length > 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: T.sub,
                      lineHeight: 1.5,
                    }}
                  >
                    {data.watched_accounts
                      .slice(0, 5)
                      .map((a) => `@${a}`)
                      .join(", ")}
                    {data.watched_accounts.length > 5 &&
                      ` +${data.watched_accounts.length - 5} more`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2
              style={{
                fontFamily: serif,
                fontSize: 20,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 14px",
              }}
            >
              Recent activity
            </h2>
            <div
              style={{
                ...glassCard,
                padding: 0,
                overflow: "hidden",
              }}
            >
              {recentActivity.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderTop: i > 0 ? `1px solid ${T.border}` : "none",
                  }}
                >
                  {/* Type indicator */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                      color:
                        item.type === "inbox" ? T.red : T.ink,
                      background:
                        item.type === "inbox"
                          ? "rgba(234,67,53,0.06)"
                          : "rgba(0,0,0,0.04)",
                      border: `1px solid ${item.type === "inbox" ? "rgba(234,67,53,0.1)" : "rgba(0,0,0,0.06)"}`,
                    }}
                  >
                    {item.type === "inbox" ? "G" : "X"}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.author}
                      {item.subject && (
                        <span style={{ color: T.muted, fontWeight: 400 }}>
                          {" "}
                          &middot; {item.subject}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      {timeAgo(item.time)}
                    </div>
                  </div>
                  {/* Status */}
                  <ActivityStatus status={item.status} urgency={item.urgency} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      style={{
        ...glassCard,
        padding: "16px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "'Instrument Serif', Georgia, serif",
          color,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#9a9a9a", fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function StatusPill({
  label,
  connected,
}: {
  label: string;
  connected: boolean;
}) {
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

function PlanBadge({
  plan,
  trialEndsAt,
}: {
  plan: string;
  trialEndsAt: string | null;
}) {
  if (plan === "pro") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.green,
          background: T.greenSoft,
          padding: "3px 8px",
          borderRadius: 6,
          border: `1px solid ${T.green}20`,
        }}
      >
        Pro
      </span>
    );
  }
  if (plan === "trial" && trialEndsAt) {
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    );
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: daysLeft <= 1 ? T.red : T.amber,
          background:
            daysLeft <= 1 ? "rgba(234,67,53,0.06)" : "rgba(217,119,6,0.06)",
          padding: "3px 8px",
          borderRadius: 6,
          border: `1px solid ${daysLeft <= 1 ? "rgba(234,67,53,0.15)" : "rgba(217,119,6,0.15)"}`,
        }}
      >
        Trial {daysLeft > 0 ? `(${daysLeft}d left)` : "(expired)"}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, color: T.muted }}>Free</span>
  );
}

function ActivityStatus({
  status,
  urgency,
}: {
  status: string;
  urgency?: string;
}) {
  if (status === "sent" || status === "posted") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.green,
          background: T.greenSoft,
          padding: "3px 8px",
          borderRadius: 6,
        }}
      >
        {status === "sent" ? "Sent" : "Posted"}
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.muted,
          background: "rgba(0,0,0,0.04)",
          padding: "3px 8px",
          borderRadius: 6,
        }}
      >
        Skipped
      </span>
    );
  }
  // Pending
  const urgencyColor =
    urgency === "red" ? T.red : urgency === "amber" ? T.amber : T.muted;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: urgencyColor,
        background:
          urgency === "red"
            ? "rgba(234,67,53,0.06)"
            : urgency === "amber"
              ? "rgba(217,119,6,0.06)"
              : "rgba(0,0,0,0.04)",
        padding: "3px 8px",
        borderRadius: 6,
      }}
    >
      Pending
    </span>
  );
}

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const firstName = name?.split(" ")[0] ?? null;
  const timeGreet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return firstName ? `${timeGreet}, ${firstName}` : timeGreet;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
