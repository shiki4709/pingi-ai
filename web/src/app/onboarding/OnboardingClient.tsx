"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

const T = {
  bg: "#0A0F1C",
  bgEnd: "#1A0B2E",
  heading: "#F1F5F9",
  body: "#B0BEC5",
  sub: "#B0BEC5",
  muted: "#8899A6",
  glass: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  borderLight: "rgba(255,255,255,0.08)",
  blue: "#4F46E5",
  purple: "#7C3AED",
  green: "#34D399",
  greenSoft: "rgba(52,211,153,0.15)",
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

type Agent = "inbox" | "engage";
// 1=choose, 2=setup, 3=subscribe, 4=done
type Screen = 1 | 2 | 3 | 4;

/** Persist selected agents across redirects (Gmail OAuth, Stripe checkout) */
function saveSelection(agents: Set<Agent>) {
  try {
    sessionStorage.setItem(
      "pingi_onboarding_agents",
      JSON.stringify(Array.from(agents))
    );
  } catch {}
}
function loadSelection(): Set<Agent> {
  try {
    const raw = sessionStorage.getItem("pingi_onboarding_agents");
    if (raw) return new Set(JSON.parse(raw) as Agent[]);
  } catch {}
  return new Set();
}

export default function OnboardingClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>(1);
  const [selected, setSelected] = useState<Set<Agent>>(new Set());

  // Setup status
  const [gmailConnected, setGmailConnected] = useState(false);
  const [inboxLinked, setInboxLinked] = useState(false);
  const [engageLinked, setEngageLinked] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);

  // Stripe
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const [debugInfo, setDebugInfo] = useState<string>("");

  // Auth check + initial status load (single useEffect to avoid flicker)
  useEffect(() => {
    (async () => {
      const { data: authData, error: authError } = await getSupabaseBrowser().auth.getUser();
      if (authError || !authData.user) {
        setDebugInfo(`Auth failed: ${authError?.message ?? "no user"}`);
        router.replace("/auth");
        setLoading(false);
        return;
      }
      setUser(authData.user);
      setDebugInfo(`userId=${authData.user.id} email=${authData.user.email}`);

      // Immediately fetch connection status before showing any UI
      try {
        const [statusRes, statsRes] = await Promise.all([
          fetch(`/api/telegram-status?userId=${authData.user.id}`),
          fetch(`/api/dashboard-stats?userId=${authData.user.id}`),
        ]);
        const status = await statusRes.json();
        const stats = await statsRes.json();

        setDebugInfo(prev => `${prev} | status=${JSON.stringify({
          inbox_linked: status.inbox_linked,
          x_linked: status.x_linked,
          gmail: status.gmail_connected,
          plan: stats.plan,
        })}`);

        // Set connection state from DB
        if (status.gmail_connected) setGmailConnected(true);
        if (status.inbox_linked) setInboxLinked(true);
        if (status.x_linked) setEngageLinked(true);
        if (stats.plan) setUserPlan(stats.plan);

        // Pre-select agents based on existing connections
        const autoSelected = new Set<Agent>();
        if (status.gmail_connected || status.inbox_linked) autoSelected.add("inbox");
        if (status.x_linked) autoSelected.add("engage");

        // Merge with sessionStorage (for returning from redirects)
        const stored = loadSelection();
        if (stored.size > 0) {
          stored.forEach((a) => autoSelected.add(a));
        }
        if (autoSelected.size > 0) setSelected(autoSelected);

        // If any agent is fully set up, redirect to dashboard
        const inboxReady = status.gmail_connected && status.inbox_linked;
        const engageReady = status.x_linked;
        if (inboxReady || engageReady) {
          router.replace("/dashboard");
          return; // Don't set loading=false, keep showing nothing during redirect
        }

        // If partially set up, skip to screen 2
        const params = new URLSearchParams(window.location.search);
        const isReturning = params.get("gmail") || params.get("subscribed") || params.get("subscribe");
        if (!isReturning && autoSelected.size > 0) {
          setScreen(2);
        }
      } catch (err) {
        setDebugInfo(prev => `${prev} | FETCH ERROR: ${err instanceof Error ? err.message : String(err)}`);
      }

      setLoading(false);
    })();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch connection status (for polling)
  const fetchStatus = useCallback(async () => {
    if (!user) return null;
    try {
      const res = await fetch(`/api/telegram-status?userId=${user.id}`);
      return await res.json();
    } catch {
      return null;
    }
  }, [user]);

  // Handle return from redirects (Gmail OAuth, Stripe checkout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Gmail OAuth return
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      const restored = loadSelection();
      if (restored.size > 0) {
        setSelected(restored);
      } else {
        setSelected(new Set<Agent>(["inbox"]));
      }
      setScreen(2);
      window.history.replaceState({}, "", "/onboarding");
    }

    // Stripe checkout return — success
    if (params.get("subscribed") === "true") {
      const restored = loadSelection();
      if (restored.size > 0) setSelected(restored);
      setScreen(4);
      window.history.replaceState({}, "", "/onboarding");
    }

    // Stripe checkout return — canceled
    if (params.get("subscribe") === "canceled") {
      const restored = loadSelection();
      if (restored.size > 0) setSelected(restored);
      setScreen(3);
      setSubscribeError("Checkout was canceled. You can try again.");
      window.history.replaceState({}, "", "/onboarding");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for Telegram links on screen 2
  useEffect(() => {
    if (screen !== 2 || !user) return;

    const needInbox = selected.has("inbox") && !inboxLinked;
    const needEngage = selected.has("engage") && !engageLinked;
    if (!needInbox && !needEngage) return;

    const interval = setInterval(async () => {
      const data = await fetchStatus();
      if (!data) return;
      if (needInbox && data.inbox_linked) setInboxLinked(true);
      if (needEngage && data.x_linked) setEngageLinked(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [screen, user, selected, inboxLinked, engageLinked, fetchStatus]);

  // Auto-advance from screen 2 → 3 (or 4 if already subscribed) when setup steps done
  useEffect(() => {
    if (screen !== 2) return;
    const inboxDone =
      !selected.has("inbox") || (gmailConnected && inboxLinked);
    const engageDone = !selected.has("engage") || engageLinked;
    if (inboxDone && engageDone) {
      const alreadyPaid = userPlan === "pro" || userPlan === "trial";
      setTimeout(() => setScreen(alreadyPaid ? 4 : 3), 800);
    }
  }, [screen, selected, gmailConnected, inboxLinked, engageLinked, userPlan]);

  const handleConnectGmail = () => {
    if (!user) return;
    saveSelection(selected);
    window.location.href = `/api/auth/gmail?user_id=${user.id}`;
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setSubscribing(true);
    setSubscribeError(null);

    // Save selection before potential redirect
    saveSelection(selected);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
        return;
      }
      if (data.upgraded || data.trial_activated) {
        // Admin bypass or Stripe not configured — skip to done
        setScreen(4);
        return;
      }
      setSubscribeError(data.error ?? "Something went wrong");
    } catch {
      setSubscribeError("Network error. Please try again.");
    }
    setSubscribing(false);
  };

  const toggleAgent = (agent: Agent) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) next.delete(agent);
      else next.add(agent);
      return next;
    });
  };

  if (loading) return null;

  // Can continue from screen 2 if at least one key step is done
  const hasProgress =
    (selected.has("inbox") && gmailConnected) ||
    (selected.has("engage") && engageLinked);

  // Progress dots: 4 screens but show 3 dots (merge 3+4 into one dot)
  const dotProgress = screen >= 3 ? 3 : screen;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        fontFamily: sans,
        background: `linear-gradient(180deg, ${T.bg} 0%, ${T.bgEnd} 50%, ${T.bg} 100%)`,
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 40,
          position: "absolute",
          top: 32,
        }}
      >
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                s <= dotProgress ? T.heading : "rgba(255,255,255,0.15)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* ─── Screen 1: Choose agents ─── */}
      {screen === 1 && (
        <div
          style={{
            textAlign: "center",
            maxWidth: 560,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontSize: "clamp(26px, 4vw, 34px)",
              fontWeight: 400,
              color: T.heading,
              margin: "0 0 6px",
            }}
          >
            Welcome to Pingi
          </h1>
          <p
            style={{
              fontSize: 15,
              color: T.body,
              margin: "0 0 6px",
              lineHeight: 1.6,
            }}
          >
            What would you like help with?
          </p>
          <p
            style={{
              fontSize: 12,
              color: T.muted,
              margin: "0 0 36px",
            }}
          >
            Setup takes about 2 minutes
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <AgentCard
              selected={selected.has("inbox")}
              onClick={() => toggleAgent("inbox")}
              icon="G"
              iconColor="#EA4335"
              iconBg="rgba(234,67,53,0.1)"
              iconBorder="rgba(234,67,53,0.15)"
              title="Inbox Agent"
              desc="AI replies to your emails via Telegram"
              bot={INBOX_BOT}
            />
            <AgentCard
              selected={selected.has("engage")}
              onClick={() => toggleAgent("engage")}
              icon="X"
              iconColor={T.heading}
              iconBg="rgba(255,255,255,0.08)"
              iconBorder="rgba(255,255,255,0.12)"
              title="Engage Agent"
              desc="AI-drafted replies on X via Telegram"
              bot={ENGAGE_BOT}
            />
          </div>

          <button
            onClick={() => setScreen(2)}
            disabled={selected.size === 0}
            style={{
              padding: "14px 52px",
              borderRadius: 12,
              border: "none",
              background:
                selected.size > 0
                  ? `linear-gradient(135deg, ${T.blue}, ${T.purple})`
                  : "rgba(255,255,255,0.08)",
              color: selected.size > 0 ? "#fff" : T.muted,
              fontSize: 15,
              fontWeight: 600,
              cursor: selected.size > 0 ? "pointer" : "default",
              fontFamily: sans,
              boxShadow:
                selected.size > 0
                  ? `0 4px 24px ${T.purple}40`
                  : "none",
              transition: "all 0.2s",
            }}
          >
            Continue
          </button>
        </div>
      )}

      {/* ─── Screen 2: Setup checklist ─── */}
      {screen === 2 && (
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1
              style={{
                fontFamily: serif,
                fontSize: 28,
                fontWeight: 400,
                color: T.heading,
                margin: "0 0 6px",
              }}
            >
              Quick setup
            </h1>
            <p style={{ fontSize: 14, color: T.body, margin: 0 }}>
              Connect your accounts. This takes under a minute.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Inbox section */}
            {selected.has("inbox") && (
              <>
                <SectionLabel label="Inbox Agent" />
                <SetupStep
                  done={gmailConnected}
                  label="Connect Gmail"
                  detail={
                    gmailConnected
                      ? "Connected"
                      : "Let Pingi monitor your inbox"
                  }
                  action={
                    !gmailConnected ? (
                      <button
                        onClick={handleConnectGmail}
                        style={actionBtnStyle}
                      >
                        Connect
                      </button>
                    ) : null
                  }
                />
                <SetupStep
                  done={inboxLinked}
                  waiting={gmailConnected && !inboxLinked}
                  disabled={!gmailConnected}
                  label={`Open @${INBOX_BOT} on Telegram`}
                  detail={
                    inboxLinked
                      ? "Linked"
                      : gmailConnected
                        ? `Send /start, then enter: ${user?.email ?? ""}`
                        : "Connect Gmail first"
                  }
                  action={
                    gmailConnected && !inboxLinked ? (
                      <a
                        href={`https://t.me/${INBOX_BOT}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...actionBtnStyle,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        Open
                      </a>
                    ) : null
                  }
                />
              </>
            )}

            {/* Engage section */}
            {selected.has("engage") && (
              <>
                <SectionLabel
                  label="Engage Agent"
                  style={
                    selected.has("inbox")
                      ? { marginTop: 8 }
                      : undefined
                  }
                />
                <SetupStep
                  done={engageLinked}
                  waiting={!engageLinked}
                  label={`Open @${ENGAGE_BOT} on Telegram`}
                  detail={
                    engageLinked
                      ? "Linked"
                      : `Send /start, then enter: ${user?.email ?? ""}`
                  }
                  action={
                    !engageLinked ? (
                      <a
                        href={`https://t.me/${ENGAGE_BOT}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...actionBtnStyle,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        Open
                      </a>
                    ) : null
                  }
                />
                <SetupStep
                  done={false}
                  disabled={!engageLinked}
                  label="Add accounts or topics to track"
                  detail={
                    engageLinked
                      ? 'In the bot, type /watch @paulg or "add Sam Altman"'
                      : "Link Telegram first"
                  }
                />
              </>
            )}
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {hasProgress && (
              <button
                onClick={() => {
                  const alreadyPaid = userPlan === "pro" || userPlan === "trial";
                  setScreen(alreadyPaid ? 4 : 3);
                }}
                style={{
                  padding: "12px 40px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: sans,
                  boxShadow: `0 4px 24px ${T.purple}40`,
                }}
              >
                Continue
              </button>
            )}
            <button
              onClick={() => {
                const alreadyPaid = userPlan === "pro" || userPlan === "trial";
                setScreen(alreadyPaid ? 4 : 3);
              }}
              style={{
                background: "none",
                border: "none",
                color: T.muted,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: sans,
                textDecoration: "underline",
                padding: "4px 0",
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ─── Screen 3: Start subscription ─── */}
      {screen === 3 && (
        <div
          style={{
            textAlign: "center",
            maxWidth: 420,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <h1
            style={{
              fontFamily: serif,
              fontSize: 28,
              fontWeight: 400,
              color: T.heading,
              margin: "0 0 6px",
            }}
          >
            Start your free trial
          </h1>
          <p
            style={{
              fontSize: 14,
              color: T.body,
              margin: "0 0 28px",
              lineHeight: 1.6,
            }}
          >
            3 days free, then $19/mo. Cancel anytime.
          </p>

          <div
            style={{
              ...glassCard,
              padding: "28px 24px",
              textAlign: "left",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: T.heading,
                marginBottom: 16,
              }}
            >
              What you get
            </div>
            {[
              "AI-drafted replies to emails and tweets",
              "Smart urgency detection and prioritization",
              "Review and send from Telegram with one tap",
              "Unlimited agents and connected accounts",
              "3-day free trial, no charge today",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 10,
                  fontSize: 13,
                  color: T.body,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    color: T.green,
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: "20px",
                    flexShrink: 0,
                  }}
                >
                  {"\u2713"}
                </span>
                {item}
              </div>
            ))}
          </div>

          {subscribeError && (
            <p
              style={{
                fontSize: 13,
                color: T.muted,
                margin: "0 0 16px",
              }}
            >
              {subscribeError}
            </p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: subscribing ? "wait" : "pointer",
              fontFamily: sans,
              boxShadow: `0 4px 24px ${T.purple}40`,
              marginBottom: 12,
            }}
          >
            {subscribing ? "Redirecting..." : "Start free trial"}
          </button>

          <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>
            You won&apos;t be charged during the trial. Cancel in one
            click.
          </p>
        </div>
      )}

      {/* Debug info — temporary */}
      {debugInfo && (
        <div style={{
          position: "fixed", bottom: 12, left: 12, right: 12,
          background: "rgba(0,0,0,0.85)", color: "#34D399",
          fontSize: 11, fontFamily: "monospace", padding: "8px 12px",
          borderRadius: 8, zIndex: 999, wordBreak: "break-all",
        }}>
          {debugInfo}
        </div>
      )}

      {/* ─── Screen 4: Done ─── */}
      {screen === 4 && (
        <div
          style={{
            textAlign: "center",
            maxWidth: 400,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: T.green,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
              margin: "0 auto 20px",
              boxShadow: `0 8px 32px ${T.green}30`,
            }}
          >
            {"\u2713"}
          </div>
          <h1
            style={{
              fontFamily: serif,
              fontSize: 30,
              fontWeight: 400,
              color: T.heading,
              margin: "0 0 8px",
            }}
          >
            You&apos;re all set
          </h1>
          <p
            style={{
              fontSize: 15,
              color: T.body,
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            Your free trial is active. Full access to all features.
          </p>
          <p
            style={{
              fontSize: 13,
              color: T.muted,
              margin: "0 0 32px",
            }}
          >
            You&apos;ll start getting notifications in Telegram.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "14px 48px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: sans,
              boxShadow: `0 4px 24px ${T.purple}40`,
            }}
          >
            Go to dashboard
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Subcomponents ─── */

const actionBtnStyle: React.CSSProperties = {
  padding: "7px 16px",
  borderRadius: 10,
  border: "none",
  background: `linear-gradient(135deg, #4F46E5, #7C3AED)`,
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  whiteSpace: "nowrap",
};

function SectionLabel({
  label,
  style,
}: {
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

function AgentCard({
  selected,
  onClick,
  icon,
  iconColor,
  iconBg,
  iconBorder,
  title,
  desc,
  bot,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  title: string;
  desc: string;
  bot: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...glassCard,
        padding: "28px 22px",
        cursor: "pointer",
        textAlign: "left",
        border: selected
          ? `2px solid ${T.green}`
          : `1px solid ${T.border}`,
        background: selected ? T.greenSoft : T.glass,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: iconBg,
          border: `1px solid ${iconBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: icon === "X" ? 16 : 14,
          fontWeight: icon === "X" ? 800 : 700,
          color: iconColor,
          marginBottom: 14,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontFamily: serif,
          fontSize: 20,
          fontWeight: 400,
          color: T.heading,
          margin: "0 0 6px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: T.body,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {desc}
      </p>
      <p
        style={{
          fontSize: 11,
          color: T.muted,
          margin: "8px 0 0",
        }}
      >
        @{bot}
      </p>
    </div>
  );
}

function SetupStep({
  done,
  waiting,
  disabled,
  label,
  detail,
  action,
}: {
  done: boolean;
  waiting?: boolean;
  disabled?: boolean;
  label: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...glassCard,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.3s",
        borderColor: done ? `rgba(52,211,153,0.3)` : T.border,
        background: done ? T.greenSoft : T.glass,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: done ? T.green : "rgba(255,255,255,0.06)",
          color: done ? "#fff" : T.muted,
          fontSize: 13,
          fontWeight: 700,
          transition: "all 0.3s",
        }}
      >
        {done ? (
          "\u2713"
        ) : waiting ? (
          <Spinner />
        ) : (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: T.muted,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: done ? T.green : T.heading,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: done ? T.green : T.muted,
            marginTop: 1,
          }}
        >
          {detail}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,0.1)",
        borderTopColor: T.heading,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
