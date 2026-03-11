"use client";

import { useEffect, useState, useCallback } from "react";
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
  tgBlue: "#229ED9",
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
};

const bgGradient = `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                    radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`;

type Agent = "inbox" | "engage";
type Screen = 1 | 2 | 3;

/** Persist selected agents across Gmail OAuth redirect */
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

  // Auth check
  useEffect(() => {
    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) {
          router.replace("/auth");
        } else {
          setUser(data.user);
        }
        setLoading(false);
      });
  }, [router]);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    if (!user) return null;
    try {
      const res = await fetch(`/api/telegram-status?userId=${user.id}`);
      return await res.json();
    } catch {
      return null;
    }
  }, [user]);

  // On load: if any agent is fully set up, go to dashboard
  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await fetchStatus();
      if (!data) return;
      if (data.gmail_connected) setGmailConnected(true);
      if (data.inbox_linked) setInboxLinked(true);
      if (data.x_linked) setEngageLinked(true);

      const inboxReady = data.gmail_connected && data.inbox_linked;
      const engageReady = data.x_linked;
      if (inboxReady || engageReady) {
        router.replace("/dashboard");
      }
    })();
  }, [user, fetchStatus, router]);

  // Restore selection + handle Gmail callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      // Restore full selection from sessionStorage (survives OAuth redirect)
      const restored = loadSelection();
      if (restored.size > 0) {
        setSelected(restored);
      } else {
        // Fallback: at minimum they were setting up inbox
        setSelected(new Set<Agent>(["inbox"]));
      }
      setScreen(2);
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

      if (needInbox && data.inbox_linked) {
        setInboxLinked(true);
      }
      if (needEngage && data.x_linked) {
        setEngageLinked(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [screen, user, selected, inboxLinked, engageLinked, fetchStatus]);

  // Auto-advance to screen 3 when all key steps are done
  // (Gmail + Telegram for inbox, Telegram for engage)
  useEffect(() => {
    if (screen !== 2) return;
    const inboxDone =
      !selected.has("inbox") || (gmailConnected && inboxLinked);
    const engageDone = !selected.has("engage") || engageLinked;
    if (inboxDone && engageDone) {
      setTimeout(() => setScreen(3), 800);
    }
  }, [screen, selected, gmailConnected, inboxLinked, engageLinked]);

  const handleConnectGmail = () => {
    if (!user) return;
    // Save selection before OAuth redirect so we can restore it
    saveSelection(selected);
    window.location.href = `/api/auth/gmail?user_id=${user.id}`;
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
        background: bgGradient,
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
              background: s <= screen ? T.ink : "rgba(0,0,0,0.12)",
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
              color: T.ink,
              margin: "0 0 6px",
            }}
          >
            Welcome to Pingi
          </h1>
          <p
            style={{
              fontSize: 15,
              color: T.sub,
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
              iconBg="rgba(234,67,53,0.06)"
              iconBorder="rgba(234,67,53,0.1)"
              title="Inbox Agent"
              desc="AI replies to your emails via Telegram"
              bot={INBOX_BOT}
            />
            <AgentCard
              selected={selected.has("engage")}
              onClick={() => toggleAgent("engage")}
              icon="X"
              iconColor={T.ink}
              iconBg="rgba(0,0,0,0.06)"
              iconBorder="rgba(0,0,0,0.08)"
              title="Engage Agent"
              desc="AI-drafted engagement on X via Telegram"
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
                  ? "linear-gradient(135deg, #1a1a1a, #333)"
                  : "rgba(0,0,0,0.08)",
              color: selected.size > 0 ? "#fff" : T.muted,
              fontSize: 15,
              fontWeight: 600,
              cursor: selected.size > 0 ? "pointer" : "default",
              fontFamily: sans,
              boxShadow:
                selected.size > 0 ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
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
                color: T.ink,
                margin: "0 0 6px",
              }}
            >
              Quick setup
            </h1>
            <p style={{ fontSize: 14, color: T.sub, margin: 0 }}>
              Connect your accounts. This takes under a minute.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                    selected.has("inbox") ? { marginTop: 8 } : undefined
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
                onClick={() => setScreen(3)}
                style={{
                  padding: "12px 40px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #1a1a1a, #333)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: sans,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                }}
              >
                Continue
              </button>
            )}
            <button
              onClick={() => setScreen(3)}
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

      {/* ─── Screen 3: Done ─── */}
      {screen === 3 && (
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
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            You&apos;re all set
          </h1>
          <p
            style={{
              fontSize: 15,
              color: T.sub,
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            Your 3-day free trial is active. Full access to all features.
          </p>
          <p
            style={{
              fontSize: 13,
              color: T.muted,
              margin: "0 0 32px",
            }}
          >
            Trial ends{" "}
            {new Date(
              Date.now() + 3 * 24 * 60 * 60 * 1000
            ).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "14px 48px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #1a1a1a, #333)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: sans,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
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
  background: "linear-gradient(135deg, #1a1a1a, #333)",
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
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 20,
          fontWeight: 400,
          color: T.ink,
          margin: "0 0 6px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: T.sub,
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
        borderColor: done ? `${T.green}50` : T.border,
        background: done ? T.greenSoft : T.glass,
      }}
    >
      {/* Status icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: done ? T.green : "rgba(0,0,0,0.04)",
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
      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: done ? T.green : T.ink,
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
      {/* Action */}
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
        border: "2px solid rgba(0,0,0,0.1)",
        borderTopColor: T.ink,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
