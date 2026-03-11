"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

const T = {
  bg: "#FAFAF7",
  surface: "#F3F2EE",
  surfaceAlt: "#ECEAE4",
  ink: "#1A1917",
  body: "#4A4A46",
  muted: "#8C8C86",
  dim: "#B5B5AE",
  accent: "#C2410C",
  border: "#E5E4DF",
  borderLight: "#EDECE8",
  green: "#16A34A",
  greenSoft: "#F0FDF4",
  red: "#DC2626",
  redSoft: "#FEF2F2",
  amber: "#D97706",
  amberSoft: "#FFFBEB",
  tgBlue: "#38BDF8",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const INBOX_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "pingi_ai_bot";
const ENGAGE_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_X_BOT_USERNAME ?? "pingi_x_bot";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${T.border}`,
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
  // Per-agent inbox stats
  inbox_sent_week: number;
  inbox_reviewed_week: number;
  inbox_sent_today: number;
  inbox_rate: number | null;
  // Per-agent engage stats
  engage_posted_week: number;
  engage_skipped_week: number;
  engage_reviewed_week: number;
  engage_posted_today: number;
  engage_rate: number | null;
  // Agent details
  watched_accounts: string[];
  search_topics: string[];
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

  if (loading || !data) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: T.bg,
          color: T.muted,
          fontFamily: sans,
          fontSize: 14,
        }}
      >
        <span className="sr-only">Loading dashboard</span>
      </div>
    );
  }

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
        background: T.bg,
      }}
    >
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
        .skip-link {
          position: absolute; top: -40px; left: 16px; z-index: 100;
          padding: 8px 16px; background: ${T.ink}; color: #fff;
          border-radius: 8px; font-size: 13px; text-decoration: none;
          font-family: ${sans};
        }
        .skip-link:focus { top: 16px; }
        *:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 2px;
        }
      `}</style>

      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Nav */}
      <nav
        aria-label="Dashboard navigation"
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
            aria-hidden="true"
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
              background: T.ink,
            }}
          >
            P
          </div>
          <span style={{ fontFamily: serif, fontSize: 19, color: T.ink }}>
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
              border: `1px solid ${T.border}`,
              background: "#fff",
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
      <main
        id="main-content"
        style={{ maxWidth: 760, margin: "0 auto", padding: "16px 32px 80px" }}
      >
        {/* Greeting */}
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(24px, 3.5vw, 32px)",
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

        {/* ─── Per-Agent Metrics ─── */}
        {hasAnyAgent && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {/* Inbox Metrics */}
            <section
              aria-label="Inbox Agent metrics"
              style={{
                ...cardStyle,
                padding: "16px 18px",
                opacity: inboxReady ? 1 : 0.5,
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#EA4335",
                    background: "rgba(234,67,53,0.08)",
                  }}
                >
                  G
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                  Inbox Agent
                </span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}>
                <MiniStat
                  value={data.inbox_pending}
                  label="Pending"
                  color={data.inbox_pending > 0 ? T.amber : T.green}
                />
                <MiniStat
                  value={data.inbox_sent_today}
                  label="Sent today"
                  color={T.ink}
                />
                <MiniStat
                  value={data.inbox_sent_week}
                  label="Sent this week"
                  color={T.ink}
                />
                <MiniStat
                  value={data.inbox_rate !== null ? `${data.inbox_rate}%` : "--"}
                  label="Send rate"
                  color={data.inbox_rate !== null && data.inbox_rate >= 80 ? T.green : T.ink}
                />
              </div>
            </section>

            {/* Engage Metrics */}
            <section
              aria-label="Engage Agent metrics"
              style={{
                ...cardStyle,
                padding: "16px 18px",
                opacity: engageReady ? 1 : 0.5,
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: T.ink,
                    background: T.surface,
                  }}
                >
                  X
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                  Engage Agent
                </span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}>
                <MiniStat
                  value={data.engage_pending}
                  label="Pending"
                  color={data.engage_pending > 0 ? T.amber : T.green}
                />
                <MiniStat
                  value={data.engage_posted_today}
                  label="Posted today"
                  color={T.ink}
                />
                <MiniStat
                  value={data.engage_posted_week}
                  label="Posted this week"
                  color={T.ink}
                />
                <MiniStat
                  value={data.engage_rate !== null ? `${data.engage_rate}%` : "--"}
                  label="Post rate"
                  color={data.engage_rate !== null && data.engage_rate >= 80 ? T.green : T.ink}
                />
              </div>
            </section>
          </div>
        )}

        {/* ─── Agent Cards ─── */}
        <section
          aria-label="Connected agents"
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
              ...cardStyle,
              padding: "20px 18px",
              borderColor: inboxReady
                ? "rgba(22,163,74,0.2)"
                : T.border,
              background: inboxReady ? T.greenSoft : "#fff",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: inboxReady ? T.green : "#EA4335",
                  background: inboxReady
                    ? T.greenSoft
                    : "rgba(234,67,53,0.08)",
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
                    color: T.ink,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Inbox Agent
                  {inboxReady && (
                    <div
                      aria-hidden="true"
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
                  borderTop: `1px solid rgba(22,163,74,0.1)`,
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
                  background: T.surface,
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
                onClick={() => router.push("/onboarding?setup=inbox")}
                style={{
                  padding: "9px 0",
                  borderRadius: 10,
                  border: "none",
                  background: T.ink,
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
              ...cardStyle,
              padding: "20px 18px",
              borderColor: engageReady
                ? "rgba(22,163,74,0.2)"
                : T.border,
              background: engageReady ? T.greenSoft : "#fff",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: engageReady ? T.green : T.ink,
                  background: engageReady
                    ? T.greenSoft
                    : T.surface,
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
                    color: T.ink,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Engage Agent
                  {engageReady && (
                    <div
                      aria-hidden="true"
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
                  borderTop: `1px solid rgba(22,163,74,0.1)`,
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
                  background: T.surface,
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
                onClick={() => router.push("/onboarding?setup=engage")}
                style={{
                  padding: "9px 0",
                  borderRadius: 10,
                  border: "none",
                  background: T.ink,
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
        </section>

        {/* ─── Recent Activity ─── */}
        {recentActivity.length > 0 && (
          <section aria-label="Recent activity">
            <h2
              style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 12px",
              }}
            >
              Recent activity
            </h2>
            <div
              role="list"
              aria-label="Activity feed"
              style={{
                ...cardStyle,
                padding: 0,
                overflow: "hidden",
              }}
            >
              {grouped.map((group, gi) => (
                <div key={group.label} role="group" aria-label={group.label}>
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
                      role="listitem"
                      style={{
                        padding: "10px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        aria-hidden="true"
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
                              : T.ink,
                          background:
                            item.type === "inbox"
                              ? "rgba(234,67,53,0.08)"
                              : T.surface,
                        }}
                      >
                        {item.type === "inbox" ? "G" : "X"}
                      </div>
                      <span className="sr-only">
                        {item.type === "inbox" ? "Gmail" : "X"} from {item.author}, {item.status}
                      </span>
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
          </section>
        )}

        {/* Empty state */}
        {hasAnyAgent && recentActivity.length === 0 && (
          <div
            style={{
              ...cardStyle,
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
      </main>
    </div>
  );
}

/* ─── Subcomponents ─── */

function MiniStat({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div
      role="group"
      aria-label={`${label}: ${value}`}
      style={{
        padding: "10px 8px",
        borderRadius: 10,
        background: T.surface,
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: 20,
          fontWeight: 700,
          fontFamily: serif,
          color,
          lineHeight: 1,
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div aria-hidden="true" style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>
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
    ? T.greenSoft
    : isSkipped
      ? T.surface
      : urgency === "red"
        ? T.redSoft
        : urgency === "amber"
          ? T.amberSoft
          : T.surface;

  const label = isSent
    ? status === "sent"
      ? "Sent"
      : "Posted"
    : isSkipped
      ? "Skip"
      : "Pending";

  return (
    <span
      role="status"
      aria-label={`Status: ${label}`}
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
      {label}
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
          background: T.greenSoft,
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
          background: daysLeft <= 1 ? T.redSoft : T.amberSoft,
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
