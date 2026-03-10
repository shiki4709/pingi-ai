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

const INBOX_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "pingi_ai_bot";
const ENGAGE_BOT =
  process.env.NEXT_PUBLIC_TELEGRAM_X_BOT_USERNAME ?? "pingi_x_bot";

type Agent = "inbox" | "engage";
type Phase = "choose" | "inbox-setup" | "engage-setup" | "done";

function StepDot({
  done,
  active,
  number,
}: {
  done: boolean;
  active: boolean;
  number: number;
}) {
  return (
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
        background: done ? T.green : active ? T.ink : "rgba(0,0,0,0.08)",
        color: done || active ? "#fff" : T.muted,
        transition: "all 0.3s",
      }}
    >
      {done ? "\u2713" : number}
    </div>
  );
}

function SkipLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: T.muted,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: sans,
        textDecoration: "underline",
        padding: "4px 0",
        marginTop: 8,
      }}
    >
      Skip for now
    </button>
  );
}

export default function OnboardingClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Agent selection
  const [selected, setSelected] = useState<Set<Agent>>(new Set());

  // Phase tracking
  const [phase, setPhase] = useState<Phase>("choose");

  // Inbox Agent state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [inboxLinked, setInboxLinked] = useState(false);
  const [checkingInbox, setCheckingInbox] = useState(false);

  // Engage Agent state
  const [engageLinked, setEngageLinked] = useState(false);
  const [checkingEngage, setCheckingEngage] = useState(false);

  // Track which agents were set up
  const [inboxDone, setInboxDone] = useState(false);
  const [engageDone, setEngageDone] = useState(false);

  // Trial
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialActivated, setTrialActivated] = useState(false);

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

  // Check for Gmail callback success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      setPhase("inbox-setup");
      window.history.replaceState({}, "", "/onboarding");
    }
  }, []);

  // Fetch link status from API
  const fetchLinkStatus = useCallback(async () => {
    if (!user) return null;
    try {
      const res = await fetch(`/api/telegram-status?userId=${user.id}`);
      return await res.json();
    } catch {
      return null;
    }
  }, [user]);

  // Manual "I've linked Telegram" button for inbox
  const checkInboxLinked = useCallback(async () => {
    setCheckingInbox(true);
    const data = await fetchLinkStatus();
    if (data?.inbox_linked) {
      setInboxLinked(true);
      setInboxDone(true);
      if (selected.has("engage") && !engageDone) {
        setPhase("engage-setup");
      } else {
        setPhase("done");
      }
    }
    setCheckingInbox(false);
  }, [fetchLinkStatus, selected, engageDone]);

  // Manual "I've set up the Engage bot" button
  const checkEngageLinked = useCallback(async () => {
    setCheckingEngage(true);
    const data = await fetchLinkStatus();
    if (data?.x_linked) {
      setEngageLinked(true);
      setEngageDone(true);
      setPhase("done");
    }
    setCheckingEngage(false);
  }, [fetchLinkStatus]);

  // Poll every 3s while on inbox-setup (step 2) or engage-setup
  useEffect(() => {
    const shouldPollInbox = phase === "inbox-setup" && gmailConnected && !inboxLinked;
    const shouldPollEngage = phase === "engage-setup" && !engageLinked;
    if (!shouldPollInbox && !shouldPollEngage) return;
    if (!user) return;

    const interval = setInterval(async () => {
      const data = await fetchLinkStatus();
      if (!data) return;

      if (shouldPollInbox && data.inbox_linked) {
        setInboxLinked(true);
        setInboxDone(true);
        // Small delay so user sees the green checkmark before advancing
        setTimeout(() => {
          if (selected.has("engage") && !engageDone) {
            setPhase("engage-setup");
          } else {
            setPhase("done");
          }
        }, 1200);
      }

      if (shouldPollEngage && data.x_linked) {
        setEngageLinked(true);
        setEngageDone(true);
        setTimeout(() => {
          setPhase("done");
        }, 1200);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [phase, gmailConnected, inboxLinked, engageLinked, user, fetchLinkStatus, selected, engageDone]);

  const handleConnectGmail = () => {
    if (!user) return;
    window.location.href = `/api/auth/gmail?user_id=${user.id}`;
  };

  const handleStartTrial = async () => {
    if (!user) return;
    setStartingTrial(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.trial_activated) {
        setTrialActivated(true);
      } else if (data.upgraded) {
        setTrialActivated(true);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // ignore
    } finally {
      setStartingTrial(false);
    }
  };

  const toggleAgent = (agent: Agent) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(agent)) {
        next.delete(agent);
      } else {
        next.add(agent);
      }
      return next;
    });
  };

  const startSetup = () => {
    if (selected.size === 0) return;
    if (selected.has("inbox")) {
      setPhase("inbox-setup");
    } else {
      setPhase("engage-setup");
    }
  };

  const skipInbox = () => {
    if (selected.has("engage")) {
      setPhase("engage-setup");
    } else {
      setPhase("done");
    }
  };

  const skipEngage = () => {
    setPhase("done");
  };

  if (loading) return null;

  const userEmail = user?.email ?? "";

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
        background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
      }}
    >
      {/* ─── Choose Phase ─── */}
      {phase === "choose" && (
        <div style={{ textAlign: "center", maxWidth: 640 }}>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 28,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            What do you want Pingi to help with?
          </h2>
          <p style={{ fontSize: 14, color: T.muted, margin: "0 0 32px" }}>
            Select one or both. You can always add the other later.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* Inbox Agent card */}
            <div
              onClick={() => toggleAgent("inbox")}
              style={{
                ...glassCard,
                padding: "28px 24px",
                cursor: "pointer",
                textAlign: "left",
                border: selected.has("inbox")
                  ? `2px solid ${T.green}`
                  : `1px solid ${T.border}`,
                background: selected.has("inbox") ? T.greenSoft : T.glass,
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(234,67,53,0.06)",
                  border: "1px solid rgba(234,67,53,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#EA4335",
                  marginBottom: 14,
                }}
              >
                G
              </div>
              <h3
                style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 400,
                  color: T.ink,
                  margin: "0 0 6px",
                }}
              >
                Inbox Agent
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: T.sub,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Never miss an important email
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: T.muted,
                  margin: "8px 0 0",
                  lineHeight: 1.5,
                }}
              >
                Connects to @{INBOX_BOT}
              </p>
            </div>

            {/* Engage Agent card */}
            <div
              onClick={() => toggleAgent("engage")}
              style={{
                ...glassCard,
                padding: "28px 24px",
                cursor: "pointer",
                textAlign: "left",
                border: selected.has("engage")
                  ? `2px solid ${T.green}`
                  : `1px solid ${T.border}`,
                background: selected.has("engage") ? T.greenSoft : T.glass,
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 800,
                  color: T.ink,
                  marginBottom: 14,
                }}
              >
                X
              </div>
              <h3
                style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 400,
                  color: T.ink,
                  margin: "0 0 6px",
                }}
              >
                Engage Agent
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: T.sub,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Build your online presence on X
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: T.muted,
                  margin: "8px 0 0",
                  lineHeight: 1.5,
                }}
              >
                Connects to @{ENGAGE_BOT}
              </p>
            </div>
          </div>

          <button
            onClick={startSetup}
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

      {/* ─── Inbox Setup Phase ─── */}
      {phase === "inbox-setup" && (
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          {/* Step indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              marginBottom: 28,
            }}
          >
            {["Connect Gmail", "Link Telegram"].map((label, i) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <StepDot
                  done={i === 0 ? gmailConnected : inboxLinked}
                  active={i === 0 ? !gmailConnected : gmailConnected && !inboxLinked}
                  number={i + 1}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight:
                      (i === 0 && !gmailConnected) ||
                      (i === 1 && gmailConnected && !inboxLinked)
                        ? 600
                        : 400,
                    color:
                      (i === 0 && gmailConnected) || (i === 1 && inboxLinked)
                        ? T.green
                        : (i === 0 && !gmailConnected) ||
                            (i === 1 && gmailConnected)
                          ? T.ink
                          : T.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
                {i < 1 && (
                  <div
                    style={{
                      width: 28,
                      height: 1.5,
                      background: gmailConnected
                        ? `${T.green}50`
                        : "rgba(0,0,0,0.06)",
                      margin: "0 6px",
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              margin: "0 0 8px",
            }}
          >
            Inbox Agent
          </p>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 26,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 4px",
            }}
          >
            {gmailConnected ? "Link Telegram" : "Connect Gmail"}
          </h2>
          <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>
            {gmailConnected
              ? "Open @" + INBOX_BOT + " on Telegram and send /start"
              : "Let Pingi monitor your inbox for messages needing replies"}
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
            {/* Step 1: Gmail */}
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
                  color: gmailConnected ? T.green : "#EA4335",
                  background: gmailConnected
                    ? T.greenSoft
                    : "rgba(234,67,53,0.04)",
                  border: `1px solid ${gmailConnected ? `${T.green}20` : "rgba(234,67,53,0.08)"}`,
                }}
              >
                {gmailConnected ? "\u2713" : "G"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                  {gmailConnected ? "Gmail connected" : "Gmail"}
                </div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  {gmailConnected
                    ? "Pingi is monitoring your inbox"
                    : "Monitor emails needing reply"}
                </div>
              </div>
              {!gmailConnected && (
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
                    fontFamily: sans,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Step 2: Link Telegram bot via email */}
            <div
              style={{
                ...glassCard,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                opacity: gmailConnected ? 1 : 0.5,
                pointerEvents: gmailConnected ? "auto" : "none",
                transition: "opacity 0.3s",
                borderColor: inboxLinked ? `${T.green}50` : T.border,
                background: inboxLinked ? T.greenSoft : T.glass,
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
                    color: inboxLinked ? T.green : T.tgBlue,
                    background: inboxLinked
                      ? T.greenSoft
                      : "rgba(34,158,217,0.04)",
                    border: `1px solid ${inboxLinked ? `${T.green}20` : "rgba(34,158,217,0.08)"}`,
                  }}
                >
                  {inboxLinked ? "\u2713" : "TG"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                    {inboxLinked ? "Telegram linked" : "Telegram"}
                  </div>
                  <div style={{ fontSize: 12, color: inboxLinked ? T.green : T.muted }}>
                    {inboxLinked
                      ? "Inbox Agent is connected"
                      : "Get notified and approve drafts"}
                  </div>
                </div>
              </div>

              {!inboxLinked && (
                <>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.025)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 13,
                      color: T.sub,
                      lineHeight: 1.6,
                    }}
                  >
                    1. Open{" "}
                    <a
                      href={`https://t.me/${INBOX_BOT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: T.tgBlue, fontWeight: 600, textDecoration: "none" }}
                    >
                      @{INBOX_BOT}
                    </a>{" "}
                    on Telegram
                    <br />
                    2. Send{" "}
                    <span style={{ fontWeight: 600, color: T.ink }}>/start</span>
                    <br />
                    3. Enter your email:{" "}
                    <span style={{ fontWeight: 600, color: T.ink }}>
                      {userEmail}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: T.muted,
                      textAlign: "center",
                    }}
                  >
                    Waiting for link... checking automatically
                  </div>

                  <button
                    onClick={checkInboxLinked}
                    disabled={checkingInbox}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(135deg, #1a1a1a, #333)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: checkingInbox ? "wait" : "pointer",
                      fontFamily: sans,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      alignSelf: "stretch",
                    }}
                  >
                    {checkingInbox ? "Checking..." : "I\u2019ve linked Telegram"}
                  </button>
                </>
              )}
            </div>
          </div>

          <SkipLink onClick={skipInbox} />
        </div>
      )}

      {/* ─── Engage Setup Phase ─── */}
      {phase === "engage-setup" && (
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              margin: "0 0 8px",
            }}
          >
            Engage Agent
          </p>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 26,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 4px",
            }}
          >
            Set up X engagement
          </h2>
          <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>
            Three steps, all inside Telegram
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
            <div
              style={{
                ...glassCard,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                borderColor: engageLinked ? `${T.green}50` : T.border,
                background: engageLinked ? T.greenSoft : T.glass,
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
                    color: engageLinked ? T.green : T.tgBlue,
                    background: engageLinked
                      ? T.greenSoft
                      : "rgba(34,158,217,0.04)",
                    border: `1px solid ${engageLinked ? `${T.green}20` : "rgba(34,158,217,0.08)"}`,
                  }}
                >
                  {engageLinked ? "\u2713" : "TG"}
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                    {engageLinked ? "Telegram linked" : "Link @" + ENGAGE_BOT}
                  </div>
                  <div style={{ fontSize: 12, color: engageLinked ? T.green : T.muted }}>
                    {engageLinked
                      ? "Engage Agent is connected"
                      : "Follow the steps below"}
                  </div>
                </div>
              </div>

              {!engageLinked && (
                <>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.025)",
                      borderRadius: 10,
                      padding: "14px 14px",
                      fontSize: 13,
                      color: T.sub,
                      lineHeight: 1.8,
                      textAlign: "left",
                    }}
                  >
                    <strong style={{ color: T.ink }}>Step 1.</strong> Open{" "}
                    <a
                      href={`https://t.me/${ENGAGE_BOT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: T.tgBlue, fontWeight: 600, textDecoration: "none" }}
                    >
                      @{ENGAGE_BOT}
                    </a>{" "}
                    on Telegram
                    <br />
                    <strong style={{ color: T.ink }}>Step 2.</strong> Send{" "}
                    <span style={{ fontWeight: 600, color: T.ink }}>/start</span>{" "}
                    and enter your email:{" "}
                    <code
                      style={{
                        background: "rgba(0,0,0,0.05)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.ink,
                        userSelect: "all",
                      }}
                    >
                      {userEmail}
                    </code>
                    <br />
                    <strong style={{ color: T.ink }}>Step 3.</strong> Use{" "}
                    <span style={{ fontWeight: 600, color: T.ink }}>
                      /watch @handle
                    </span>{" "}
                    to add accounts you want to engage with
                  </div>

                  <a
                    href={`https://t.me/${ENGAGE_BOT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(135deg, #1a1a1a, #333)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: sans,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      textDecoration: "none",
                      textAlign: "center",
                    }}
                  >
                    Open @{ENGAGE_BOT} on Telegram
                  </a>

                  <div
                    style={{
                      fontSize: 11,
                      color: T.muted,
                      textAlign: "center",
                    }}
                  >
                    Waiting for link... checking automatically
                  </div>

                  <button
                    onClick={checkEngageLinked}
                    disabled={checkingEngage}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: `1px solid ${T.green}40`,
                      background: T.greenSoft,
                      color: T.green,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: checkingEngage ? "wait" : "pointer",
                      fontFamily: sans,
                    }}
                  >
                    {checkingEngage ? "Checking..." : "I\u2019ve set up the Engage bot"}
                  </button>
                </>
              )}
            </div>
          </div>

          <SkipLink onClick={skipEngage} />
        </div>
      )}

      {/* ─── Done Phase ─── */}
      {phase === "done" && (
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: T.green,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              margin: "0 auto 16px",
            }}
          >
            {"\u2713"}
          </div>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 26,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            {inboxDone || engageDone ? "You\u2019re all set" : "Setup complete"}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: T.sub,
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}
          >
            {inboxDone && engageDone
              ? "Both agents are active. Pingi will monitor your inbox and help you engage on X through Telegram."
              : inboxDone
                ? "Inbox Agent is active. Pingi will send you email notifications in Telegram."
                : engageDone
                  ? "Engage Agent is active. Pingi will draft replies for your watched X accounts."
                  : "You can set up agents anytime from your Telegram bots."}
          </p>

          {/* Trial offer */}
          {trialActivated ? (
            <div
              style={{
                ...glassCard,
                border: `1.5px solid ${T.green}40`,
                background: T.greenSoft,
                padding: "20px 20px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: T.green,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  margin: "0 auto 12px",
                }}
              >
                {"\u2713"}
              </div>
              <p
                style={{
                  fontFamily: serif,
                  fontSize: 20,
                  fontWeight: 400,
                  color: T.ink,
                  margin: "0 0 6px",
                  lineHeight: 1.3,
                }}
              >
                Trial activated
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: T.sub,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                You have 3 days of full Pro access. Unlimited drafts, unlimited
                accounts.
              </p>
            </div>
          ) : (
            <div
              style={{
                ...glassCard,
                border: `1.5px solid ${T.green}40`,
                padding: "20px 20px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.green,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 8px",
                }}
              >
                Unlock Pro
              </p>
              <p
                style={{
                  fontFamily: serif,
                  fontSize: 20,
                  fontWeight: 400,
                  color: T.ink,
                  margin: "0 0 6px",
                  lineHeight: 1.3,
                }}
              >
                Start your 3-day free trial of Pro
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: T.sub,
                  margin: "0 0 16px",
                  lineHeight: 1.5,
                }}
              >
                Unlimited Gmail accounts, unlimited X accounts, unlimited AI
                drafts. Cancel anytime.
              </p>
              <button
                onClick={handleStartTrial}
                disabled={startingTrial}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: `linear-gradient(135deg, ${T.green}, #1e7a3a)`,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: startingTrial ? "wait" : "pointer",
                  fontFamily: sans,
                  boxShadow: "0 4px 16px rgba(42,138,74,0.15)",
                }}
              >
                {startingTrial ? "Activating..." : "Start free trial"}
              </button>
            </div>
          )}

          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "12px 44px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #1a1a1a, #333)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: sans,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              marginBottom: 8,
            }}
          >
            Go to dashboard
          </button>
          {!trialActivated && (
            <div>
              <button
                onClick={() => router.push("/dashboard")}
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
                Skip, stay on free plan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
