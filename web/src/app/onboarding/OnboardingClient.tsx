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

export default function OnboardingClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [checkingTelegram, setCheckingTelegram] = useState(false);

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
            .then((d) => {
              if (d.code) setLinkCode(d.code);
            })
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
      // Clean up URL
      window.history.replaceState({}, "", "/onboarding");
    }
  }, []);

  const checkTelegramLinked = useCallback(async () => {
    if (!user) return;
    setCheckingTelegram(true);
    try {
      const res = await fetch(`/api/telegram-status?userId=${user.id}`);
      const data = await res.json();
      if (data.linked) {
        setTelegramLinked(true);
      }
    } catch {
      // ignore
    } finally {
      setCheckingTelegram(false);
    }
  }, [user]);

  if (loading) return null;

  const handleConnectGmail = () => {
    if (!user) return;
    window.location.href = `/api/auth/gmail?user_id=${user.id}`;
  };

  // Determine current step
  const step = telegramLinked ? 3 : gmailConnected ? 2 : 1;

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
          gap: 0,
          marginBottom: 28,
        }}
      >
        {["Connect Gmail", "Link Telegram", "Done"].map((label, i) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <StepDot done={step > i + 1} active={step === i + 1} number={i + 1} />
            <span
              style={{
                fontSize: 12,
                fontWeight: step === i + 1 ? 600 : 400,
                color: step === i + 1 ? T.ink : step > i + 1 ? T.green : T.muted,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
            {i < 2 && (
              <div
                style={{
                  width: 28,
                  height: 1.5,
                  background: step > i + 1 ? `${T.green}50` : "rgba(0,0,0,0.06)",
                  margin: "0 6px",
                  borderRadius: 1,
                  transition: "background 0.3s",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* All set state */}
      {telegramLinked ? (
        <div style={{ textAlign: "center", maxWidth: 400 }}>
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
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 26,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 8px",
            }}
          >
            All set
          </h2>
          <p
            style={{
              fontSize: 14,
              color: T.sub,
              margin: "0 0 28px",
              lineHeight: 1.6,
            }}
          >
            Pingi will start monitoring your inbox and send you notifications in
            Telegram when someone needs a reply.
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
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
            Go to dashboard
          </button>
        </div>
      ) : (
        <>
          <h2
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
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
              ? "Pingi sends notifications and draft replies here"
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
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Step 2: Telegram */}
            <div
              style={{
                ...glassCard,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                opacity: gmailConnected ? 1 : 0.5,
                pointerEvents: gmailConnected ? "auto" : "none",
                transition: "opacity 0.3s",
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
                  padding: "12px 14px",
                  fontSize: 13,
                  color: T.sub,
                  lineHeight: 1.6,
                }}
              >
                Open Telegram and search for{" "}
                <span style={{ fontWeight: 600, color: T.ink }}>
                  @{BOT_USERNAME}
                </span>
                , then send this message:
                {linkCode ? (
                  <code
                    style={{
                      display: "block",
                      marginTop: 10,
                      background: "rgba(0,0,0,0.05)",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 600,
                      color: T.ink,
                      letterSpacing: "0.05em",
                      userSelect: "all",
                      textAlign: "center",
                    }}
                  >
                    /link {linkCode}
                  </code>
                ) : (
                  <span style={{ color: T.muted }}> loading code...</span>
                )}
              </div>

              <button
                onClick={checkTelegramLinked}
                disabled={checkingTelegram}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #1a1a1a, #333)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: checkingTelegram ? "wait" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  alignSelf: "stretch",
                }}
              >
                {checkingTelegram ? "Checking..." : "I've linked Telegram"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
