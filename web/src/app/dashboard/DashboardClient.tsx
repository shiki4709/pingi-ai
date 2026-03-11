"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

const T = {
  bg: "#0A0F1C",
  bgEnd: "#1A0B2E",
  heading: "#F1F5F9",
  body: "#B0BEC5",
  muted: "#8899A6",
  dim: "#6B7B8D",
  glass: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  borderLight: "rgba(255,255,255,0.08)",
  blue: "#4F46E5",
  purple: "#7C3AED",
  green: "#34D399",
  greenDim: "rgba(52,211,153,0.15)",
  red: "#EF4444",
  redDim: "rgba(239,68,68,0.12)",
  amber: "#F59E0B",
  amberDim: "rgba(245,158,11,0.12)",
  tgBlue: "#38BDF8",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const INBOX_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "pingi_ai_bot";
const ENGAGE_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_X_BOT_USERNAME ?? "pingi_x_bot";

const glassCard: React.CSSProperties = {
  background: T.glass,
  backdropFilter: "blur(20px) saturate(1.8)",
  WebkitBackdropFilter: "blur(20px) saturate(1.8)",
  border: `1px solid ${T.border}`,
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
  borderRadius: 16,
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
  actioned_today: number;
  reviewed_this_week: number;
  response_rate: number | null;
  watched_accounts: string[];
  search_topics: string[];
  engage_posted_week: number;
  last_inbox_activity: string | null;
  last_engage_activity: string | null;
  recent_inbox: ActivityItem[];
  recent_engage: ActivityItem[];
}

export default function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      const { data: authData, error: authError } =
        await getSupabaseBrowser().auth.getUser();
      if (authError || !authData.user) {
        router.replace("/auth");
        setLoading(false);
        return;
      }
      setUser(authData.user);
      try {
        const res = await fetch(
          `/api/dashboard-stats?userId=${authData.user.id}`
        );
        const d = await res.json();
        if (!d.error) setData(d);
      } catch (e) {
        console.error("[dashboard] Fetch failed:", e);
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading || !data) return null;

  const inboxReady = data.gmail_connected && data.inbox_linked;
  const engageReady = data.x_linked;
  const hasAnyAgent = inboxReady || engageReady;

  const greeting = getGreeting(
    data.name || user?.user_metadata?.full_name || null
  );

  // Merge and sort recent activity, group by day
  const recentActivity = [...data.recent_inbox, ...data.recent_engage]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 15);

  const grouped = groupByDay(recentActivity);

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: sans,
        color: T.body,
        background: `linear-gradient(180deg, ${T.bg} 0%, ${T.bgEnd} 50%, ${T.bg} 100%)`,
      }}
    >
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          maxWidth: 760,
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
          <span style={{ fontFamily: serif, fontSize: 19, color: T.heading }}>
            Pingi
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PlanBadge plan={data.plan} trialEndsAt={data.trial_ends_at} />
          <button
            onClick={async () => {
              await getSupabaseBrowser().auth.signOut();
              router.replace("/auth");
            }}
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              border: `1px solid ${T.borderLight}`,
              background: "rgba(255,255,255,0.04)",
              color: T.muted,
              fontSize: 12,
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
        style={{ maxWidth: 760, margin: "0 auto", padding: "16px 32px 80px" }}
      >
        {/* Greeting */}
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(24px, 3.5vw, 32px)",
            fontWeight: 400,
            color: T.heading,
            margin: "0 0 4px",
          }}
        >
          {greeting}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: T.body,
            margin: "0 0 24px",
            lineHeight: 1.6,
          }}
        >
          {hasAnyAgent
            ? data.pending_count > 0
              ? `${data.pending_count} item${data.pending_count !== 1 ? "s" : ""} waiting for your review in Telegram.`
              : "All caught up. Your agents are working."
            : "Connect your agents to get started."}
        </p>

        {/* ─── Hero Stats Row ─── */}
        {hasAnyAgent && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <HeroStat
              value={data.pending_count}
              label="Pending"
              color={data.pending_count > 0 ? T.amber : T.green}
            />
            <HeroStat
              value={data.actioned_today}
              label="Actioned today"
              color={T.heading}
            />
            <HeroStat
              value={data.actioned_this_week}
              label="This week"
              color={T.heading}
            />
            <HeroStat
              value={
                data.response_rate !== null ? `${data.response_rate}%` : "--"
              }
              label="Action rate"
              color={
                data.response_rate !== null && data.response_rate >= 80
                  ? T.green
                  : T.heading
              }
            />
          </div>
        )}

        {/* ─── Agent Cards ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {/* Inbox Agent */}
          <div
            style={{
              ...glassCard,
              padding: "20px 18px",
              borderColor: inboxReady
                ? "rgba(52,211,153,0.2)"
                : T.border,
              background: inboxReady ? T.greenDim : T.glass,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: inboxReady ? T.green : T.red,
                  background: inboxReady
                    ? T.greenDim
                    : T.redDim,
                  flexShrink: 0,
                }}
              >
                {inboxReady ? "\u2713" : "G"}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.heading,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Inbox Agent
                  {inboxReady && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: T.green,
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: inboxReady ? T.green : T.muted,
                    marginTop: 1,
                  }}
                >
                  {inboxReady
                    ? data.inbox_pending > 0
                      ? `${data.inbox_pending} pending`
                      : "Monitoring"
                    : !data.gmail_connected
                      ? "Gmail not connected"
                      : "Telegram not linked"}
                </div>
              </div>
            </div>

            {inboxReady && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: `1px solid rgba(52,211,153,0.1)`,
                  paddingTop: 10,
                  fontSize: 11,
                  color: T.muted,
                }}
              >
                <span>{data.gmail_email ?? "Active"}</span>
                {data.last_inbox_activity && (
                  <span>Last: {timeAgo(data.last_inbox_activity)}</span>
                )}
              </div>
            )}

            {inboxReady ? (
              <a
                href={`https://t.me/${INBOX_BOT}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "9px 0",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${T.borderLight}`,
                  color: T.body,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: sans,
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Open in Telegram
              </a>
            ) : (
              <button
                onClick={() => router.push("/onboarding")}
                style={{
                  padding: "9px 0",
                  borderRadius: 10,
                  border: "none",
                  background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: sans,
                }}
              >
                Set up
              </button>
            )}
          </div>

          {/* Engage Agent */}
          <div
            style={{
              ...glassCard,
              padding: "20px 18px",
              borderColor: engageReady
                ? "rgba(52,211,153,0.2)"
                : T.border,
              background: engageReady ? T.greenDim : T.glass,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: engageReady ? T.green : T.heading,
                  background: engageReady
                    ? T.greenDim
                    : "rgba(255,255,255,0.06)",
                  flexShrink: 0,
                }}
              >
                {engageReady ? "\u2713" : "X"}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.heading,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Engage Agent
                  {engageReady && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: T.green,
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: engageReady ? T.green : T.muted,
                    marginTop: 1,
                  }}
                >
                  {engageReady
                    ? data.engage_pending > 0
                      ? `${data.engage_pending} pending`
                      : "Scanning"
                    : "Not connected"}
                </div>
              </div>
            </div>

            {/* Watched accounts + topics */}
            {engageReady && (
              <div
                style={{
                  borderTop: `1px solid rgba(52,211,153,0.1)`,
                  paddingTop: 10,
                  fontSize: 11,
                  color: T.muted,
                }}
              >
                {data.watched_accounts.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: T.dim, fontWeight: 600 }}>Tracking: </span>
                    {data.watched_accounts.map((a, i) => (
                      <span key={a}>
                        <span style={{ color: T.body }}>@{a}</span>
                        {i < data.watched_accounts.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
                {data.search_topics.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: T.dim, fontWeight: 600 }}>Topics: </span>
                    {data.search_topics.map((t, i) => (
                      <span key={t}>
                        <span style={{ color: T.body }}>{t}</span>
                        {i < data.search_topics.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    {data.engage_posted_week > 0
                      ? `${data.engage_posted_week} posted this week`
                      : data.watched_accounts.length > 0
                        ? `${data.watched_accounts.length} account${data.watched_accounts.length !== 1 ? "s" : ""}`
                        : "Active"}
                  </span>
                  {data.last_engage_activity && (
                    <span>Last: {timeAgo(data.last_engage_activity)}</span>
                  )}
                </div>
              </div>
            )}

            {engageReady ? (
              <a
                href={`https://t.me/${ENGAGE_BOT}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "9px 0",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${T.borderLight}`,
                  color: T.body,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: sans,
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Open in Telegram
              </a>
            ) : (
              <button
                onClick={() => router.push("/onboarding")}
                style={{
                  padding: "9px 0",
                  borderRadius: 10,
                  border: "none",
                  background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: sans,
                }}
              >
                Set up
              </button>
            )}
          </div>
        </div>

        {/* ─── Recent Activity ─── */}
        {recentActivity.length > 0 && (
          <div>
            <h2
              style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 400,
                color: T.heading,
                margin: "0 0 12px",
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
              {grouped.map((group, gi) => (
                <div key={group.label}>
                  {/* Day header */}
                  <div
                    style={{
                      padding: "10px 20px 6px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      borderTop:
                        gi > 0 ? `1px solid ${T.borderLight}` : "none",
                    }}
                  >
                    {group.label}
                  </div>
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "10px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          flexShrink: 0,
                          color:
                            item.type === "inbox"
                              ? "#EA4335"
                              : T.heading,
                          background:
                            item.type === "inbox"
                              ? "rgba(234,67,53,0.1)"
                              : "rgba(255,255,255,0.06)",
                        }}
                      >
                        {item.type === "inbox" ? "G" : "X"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: T.heading,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.author}
                          {item.subject && (
                            <span
                              style={{
                                color: T.muted,
                                fontWeight: 400,
                              }}
                            >
                              {" "}
                              &middot; {item.subject}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.muted,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {timeShort(item.time)}
                      </span>
                      <StatusBadge
                        status={item.status}
                        urgency={item.urgency}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {hasAnyAgent && recentActivity.length === 0 && (
          <div
            style={{
              ...glassCard,
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: T.body,
                margin: "0 0 4px",
              }}
            >
              No activity yet
            </p>
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
              Your agents are scanning. Items will appear here once
              found.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Subcomponents ─── */

function HeroStat({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div style={{ ...glassCard, padding: "14px 12px", textAlign: "center" }}>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          fontFamily: serif,
          color,
          lineHeight: 1,
          marginBottom: 3,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  urgency,
}: {
  status: string;
  urgency?: string;
}) {
  const isSent = status === "sent" || status === "posted";
  const isSkipped = status === "skipped";
  const color = isSent
    ? T.green
    : isSkipped
      ? T.muted
      : urgency === "red"
        ? T.red
        : urgency === "amber"
          ? T.amber
          : T.muted;
  const bg = isSent
    ? T.greenDim
    : isSkipped
      ? "rgba(255,255,255,0.06)"
      : urgency === "red"
        ? T.redDim
        : urgency === "amber"
          ? T.amberDim
          : "rgba(255,255,255,0.06)";

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color,
        background: bg,
        padding: "2px 7px",
        borderRadius: 5,
        flexShrink: 0,
      }}
    >
      {isSent
        ? status === "sent"
          ? "Sent"
          : "Posted"
        : isSkipped
          ? "Skip"
          : "Pending"}
    </span>
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
          background: T.greenDim,
          padding: "3px 8px",
          borderRadius: 6,
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
          background: daysLeft <= 1 ? T.redDim : T.amberDim,
          padding: "3px 8px",
          borderRadius: 6,
        }}
      >
        Trial {daysLeft > 0 ? `(${daysLeft}d)` : "(expired)"}
      </span>
    );
  }
  return null;
}

/* ─── Helpers ─── */

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const firstName = name?.split(" ")[0] ?? null;
  const t =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return firstName ? `${t}, ${firstName}` : t;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeShort(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDay(
  items: ActivityItem[]
): { label: string; items: ActivityItem[] }[] {
  const groups: { label: string; items: ActivityItem[] }[] = [];
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  for (const item of items) {
    const d = new Date(item.time).toDateString();
    const label =
      d === todayStr
        ? "Today"
        : d === yesterdayStr
          ? "Yesterday"
          : new Date(item.time).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            });

    const existing = groups.find((g) => g.label === label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}
