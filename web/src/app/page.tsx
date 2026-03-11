"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const T = {
  ink: "#1a1a1a",
  sub: "#6b6b6b",
  muted: "#9a9a9a",
  glass: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.45)",
  green: "#2a8a4a",
  greenSoft: "rgba(42,138,74,0.08)",
  bg: "rgba(242,240,236,1)",
  tgBlue: "#229ED9",
  tgBubble: "#E3F2FD",
  tgBubbleOut: "#DCF8C6",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const background = `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
  radial-gradient(ellipse at 50% 50%, ${T.bg} 0%, rgba(234,230,223,1) 100%)`;

const keyframesCSS = `
@keyframes dash-flow {
  0% { stroke-dashoffset: 16; }
  100% { stroke-dashoffset: 0; }
}
@keyframes fadeUp {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes typing-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes typing-dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}
@keyframes checkPop {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes slideInRight {
  0% { opacity: 0; transform: translateX(20px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(42,138,74,0.3); }
  50% { box-shadow: 0 0 0 8px rgba(42,138,74,0); }
}
`;

// ─── Reusable components ───

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

function PrimaryButton({
  children,
  href,
  style,
}: {
  children: React.ReactNode;
  href: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        padding: "14px 44px",
        borderRadius: 12,
        border: "none",
        color: "#fff",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        background: "linear-gradient(135deg, #1a1a1a, #333)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        fontFamily: sans,
        textDecoration: "none",
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </Link>
  );
}

// ─── SVG Icons ───

function TelegramIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={T.tgBlue} />
      <path
        d="M6.5 12.3l2.3.8 1 3c.1.2.3.3.5.2l1.4-1.2 2.7 2c.3.2.6 0 .7-.3l2-9.5c.1-.4-.2-.6-.5-.5L6.5 11.5c-.4.1-.4.6 0 .8z"
        fill="white"
      />
    </svg>
  );
}

function XIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#000" />
      <path
        d="M13.5 10.5L18.5 4.5H17L12.9 9.6L9.5 4.5H5L10.3 12.9L5 19.5H6.5L11 13.8L14.5 19.5H19L13.5 10.5Z"
        fill="white"
        strokeWidth="0"
      />
    </svg>
  );
}

function GmailIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
        fill="#F4F4F4"
        stroke="#E0E0E0"
        strokeWidth="0.5"
      />
      <path
        d="M22 6l-10 7L2 6"
        stroke="#EA4335"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M2 6l3 2.5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 6l-3 2.5" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill={T.green} />
      <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Interactive Demo ───

function InteractiveDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Step timings: step 0 (tweet) 3s, step 1 (drafting) 2.5s, step 2 (notification) 3s, step 3 (posted) 3s, then loop
    const timings = [3000, 2500, 3000, 3000];
    const timer = setTimeout(() => {
      setStep((s) => (s + 1) % 4);
    }, timings[step]);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
      {/* Phone frame */}
      <div
        style={{
          width: 320,
          maxWidth: "100%",
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: `1px solid ${T.border}`,
          borderRadius: 32,
          padding: "16px 16px 24px",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.08), 0 0.5px 0 rgba(255,255,255,0.6) inset",
          position: "relative" as const,
          overflow: "hidden",
          minHeight: 420,
        }}
      >
        {/* Status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 8px 12px",
            fontSize: 11,
            color: T.muted,
            fontWeight: 600,
          }}
        >
          <span>9:41</span>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: T.ink,
            }}
          />
          <span style={{ fontSize: 10 }}>100%</span>
        </div>

        {/* App header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 4px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #1a1a1a, #3a3a3a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: serif,
              color: "#fff",
            }}
          >
            P
          </div>
          <span style={{ fontFamily: serif, fontSize: 15, color: T.ink }}>
            Pingi
          </span>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: T.green,
              marginLeft: -2,
            }}
          />
        </div>

        {/* Step content */}
        <div style={{ minHeight: 300, position: "relative" as const }}>
          {/* Step 0: Tweet appears */}
          <div
            style={{
              opacity: step >= 0 ? 1 : 0,
              transform: step >= 0 ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.5s ease",
            }}
          >
            <div
              style={{
                background: "rgba(0,0,0,0.03)",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: "#e8e5e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.sub,
                  }}
                >
                  PG
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                    Paul Graham
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>@paulg</div>
                </div>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: T.ink,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                The best way to come up with startup ideas is to notice problems
                in your own life. The tricky part is that you have to be
                working on something for the problems to become apparent.
              </p>
            </div>
          </div>

          {/* Step 1: Drafting animation */}
          <div
            style={{
              opacity: step >= 1 ? 1 : 0,
              transform: step >= 1 ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.5s ease",
              transitionDelay: step >= 1 ? "0.2s" : "0s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background:
                  step === 1
                    ? "rgba(42,138,74,0.06)"
                    : "rgba(42,138,74,0.04)",
                borderRadius: 10,
                marginBottom: 12,
                transition: "background 0.3s",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background:
                    step >= 2 ? T.green : "rgba(42,138,74,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.3s",
                }}
              >
                {step >= 2 ? (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      d="M2 5l2.5 2.5L8 3"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: T.green,
                      animation:
                        step === 1 ? "pulseGlow 1s ease infinite" : "none",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: step >= 2 ? T.green : T.sub,
                  fontWeight: 500,
                }}
              >
                {step >= 2
                  ? "AI draft ready"
                  : "Pingi AI drafting reply"}
                {step === 1 && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      animation: "typing-cursor 1s infinite",
                    }}
                  >
                    ...
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Step 2: Telegram notification with draft + buttons */}
          <div
            style={{
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? "translateX(0)" : "translateX(20px)",
              transition: "all 0.5s ease",
              transitionDelay: step >= 2 ? "0.15s" : "0s",
            }}
          >
            <div
              style={{
                background: T.tgBubble,
                borderRadius: "14px 14px 14px 4px",
                padding: "14px 16px",
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: T.ink,
                  margin: "0 0 12px",
                  lineHeight: 1.5,
                }}
              >
                &quot;This resonates. I built my last startup from a
                problem I hit running my freelance practice — couldn&apos;t
                find a good way to track client communication. The
                &apos;working on something&apos; part is what most people
                skip.&quot;
              </p>
              {/* Inline buttons */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    background:
                      step === 3
                        ? T.green
                        : "rgba(34,158,217,0.12)",
                    color: step === 3 ? "#fff" : T.tgBlue,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: sans,
                    cursor: "default",
                    transition: "all 0.3s ease",
                  }}
                >
                  {step === 3 ? "Posted" : "Post"}
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(0,0,0,0.05)",
                    color: T.sub,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: sans,
                    cursor: "default",
                    opacity: step === 3 ? 0.4 : 1,
                    transition: "opacity 0.3s",
                  }}
                >
                  Edit
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(0,0,0,0.05)",
                    color: T.sub,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: sans,
                    cursor: "default",
                    opacity: step === 3 ? 0.4 : 1,
                    transition: "opacity 0.3s",
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Posted confirmation */}
          <div
            style={{
              opacity: step >= 3 ? 1 : 0,
              transform: step >= 3 ? "scale(1)" : "scale(0.8)",
              transition: "all 0.4s ease",
              transitionDelay: step >= 3 ? "0.2s" : "0s",
              textAlign: "center" as const,
              padding: "8px 0",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: T.greenSoft,
                padding: "10px 20px",
                borderRadius: 12,
                border: `1px solid ${T.green}20`,
              }}
            >
              <CheckIcon size={18} />
              <span
                style={{ fontSize: 13, fontWeight: 600, color: T.green }}
              >
                Your reply is live
              </span>
            </div>
          </div>
        </div>

        {/* Step indicator dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            paddingTop: 12,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: step === i ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: step === i ? T.ink : "rgba(0,0,0,0.12)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Flow diagram for product cards ───

function FlowDiagram({
  sourceIcon,
  sourceLabel,
}: {
  sourceIcon: React.ReactNode;
  sourceLabel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "24px 0 8px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {sourceIcon}
        </div>
        <div
          style={{
            fontSize: 10,
            color: T.muted,
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {sourceLabel}
        </div>
      </div>

      <svg
        width="48"
        height="20"
        style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}
      >
        <line
          x1="0"
          y1="10"
          x2="48"
          y2="10"
          stroke={T.muted}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          style={{ animation: "dash-flow 0.8s linear infinite" }}
        />
        <polygon points="44,6 50,10 44,14" fill={T.muted} />
      </svg>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)",
            boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            fontFamily: serif,
            color: "#fff",
          }}
        >
          P
        </div>
        <div
          style={{
            fontSize: 10,
            color: T.ink,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          Pingi
        </div>
      </div>

      <svg
        width="48"
        height="20"
        style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}
      >
        <line
          x1="0"
          y1="10"
          x2="48"
          y2="10"
          stroke={T.tgBlue}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          style={{ animation: "dash-flow 0.8s linear infinite" }}
        />
        <polygon points="44,6 50,10 44,14" fill={T.tgBlue} />
      </svg>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TelegramIcon size={22} />
        </div>
        <div
          style={{
            fontSize: 10,
            color: T.muted,
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          Telegram
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background,
        fontFamily: sans,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: keyframesCSS }} />

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        </div>
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

      {/* ─── Hero ─── */}
      <section
        style={{
          padding: "80px 32px 20px",
          maxWidth: 800,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(36px, 5vw, 52px)",
            fontWeight: 400,
            color: T.ink,
            margin: "0 0 20px",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Engage with thought leaders
          <br />
          in 10 seconds
        </h1>
        <p
          style={{
            fontSize: 17,
            color: T.sub,
            margin: "0 auto 40px",
            lineHeight: 1.65,
            maxWidth: 580,
          }}
        >
          Pingi watches X accounts you care about, drafts thoughtful replies
          with AI, and sends them to your Telegram. Review, edit, post. Build
          your online presence effortlessly — without doomscrolling.
        </p>
        <PrimaryButton
          href="/auth"
          style={{ fontSize: 16, padding: "16px 52px" }}
        >
          Start free — 3 day trial
        </PrimaryButton>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 14 }}>
          No credit card required.
        </p>
      </section>

      {/* ─── Interactive Demo ─── */}
      <section
        style={{
          padding: "60px 32px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              margin: "0 0 8px",
            }}
          >
            How it works
          </p>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 32,
              fontWeight: 400,
              color: T.ink,
              margin: 0,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            From tweet to reply in seconds
          </h2>
        </div>
        <InteractiveDemo />
      </section>

      {/* ─── Value Props ─── */}
      <section
        style={{
          padding: "60px 32px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          <GlassCard style={{ padding: "32px 28px" }}>
            <h3
              style={{
                fontFamily: serif,
                fontSize: 24,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 10px",
                lineHeight: 1.2,
              }}
            >
              No more doomscrolling
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.sub,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Pingi finds the conversations worth joining. You just approve.
            </p>
          </GlassCard>

          <GlassCard style={{ padding: "32px 28px" }}>
            <h3
              style={{
                fontFamily: serif,
                fontSize: 24,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 10px",
                lineHeight: 1.2,
              }}
            >
              10 seconds per interaction
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.sub,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Review the AI draft, tap Post. Done. Your brand grows while you
              work.
            </p>
          </GlassCard>

          <GlassCard style={{ padding: "32px 28px" }}>
            <h3
              style={{
                fontFamily: serif,
                fontSize: 24,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 10px",
                lineHeight: 1.2,
              }}
            >
              Human in the loop
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.sub,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Every reply is reviewed by you. AI drafts, you decide. Authentic
              engagement, not bots.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* ─── Two Products ─── */}
      <section
        style={{
          padding: "40px 32px 60px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 32,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 12px",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            Two agents. One subscription.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: T.sub,
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Everything runs through Telegram — no new apps to learn.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
          }}
        >
          {/* X Engage Agent — featured first */}
          <GlassCard
            style={{
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              border: `1.5px solid ${T.green}30`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -11,
                right: 20,
                background: T.green,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 6,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Popular
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
              Build your presence on X
            </p>
            <h3
              style={{
                fontFamily: serif,
                fontSize: 28,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 16px",
                lineHeight: 1.2,
              }}
            >
              X Engage Agent
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.ink,
                margin: "0 0 12px",
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              Track @paulg, @naval, @sama. Get notified when they post. AI
              drafts your reply. Tap to engage.
            </p>
            <p
              style={{
                fontSize: 14,
                color: T.sub,
                margin: 0,
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              Watch any accounts you want. Pingi monitors their posts, drafts
              context-aware replies, and sends them straight to Telegram. You
              review. You post. You grow.
            </p>
            <FlowDiagram sourceIcon={<XIcon size={22} />} sourceLabel="X" />
          </GlassCard>

          {/* Inbox Agent */}
          <GlassCard
            style={{
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
            }}
          >
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
              Never miss important emails
            </p>
            <h3
              style={{
                fontFamily: serif,
                fontSize: 28,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 16px",
                lineHeight: 1.2,
              }}
            >
              Inbox Agent
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.ink,
                margin: "0 0 12px",
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              Never miss an important email. Pingi filters 100+ emails down to
              the 3-5 that need replies.
            </p>
            <p
              style={{
                fontSize: 14,
                color: T.sub,
                margin: 0,
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              Connects to your Gmail, filters out noise, drafts replies, and
              sends only what matters to Telegram. Tap Send, Edit, or Skip.
            </p>
            <FlowDiagram
              sourceIcon={<GmailIcon size={22} />}
              sourceLabel="Gmail"
            />
          </GlassCard>
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "20px 32px 60px",
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: T.muted,
            margin: 0,
            lineHeight: 1.8,
          }}
        >
          Track and engage with anyone on X —{" "}
          {["@paulg", "@naval", "@sama", "@levelsio", "@elonmusk"].map(
            (handle, i, arr) => (
              <span key={handle}>
                <span style={{ color: T.ink, fontWeight: 500 }}>
                  {handle}
                </span>
                {i < arr.length - 1 ? ", " : ""}
              </span>
            )
          )}
        </p>
      </section>

      {/* ─── Pricing ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "40px 32px 60px",
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <GlassCard
          style={{
            border: `1.5px solid ${T.green}40`,
            position: "relative",
            textAlign: "left",
            padding: "40px 36px",
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
            <span
              style={{ fontSize: 16, color: T.muted, fontFamily: sans }}
            >
              {" "}
              / month
            </span>
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 28px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              "X Engage Agent + Inbox Agent",
              "Unlimited accounts to watch",
              "Unlimited AI-drafted replies",
              "Smart email filtering",
              "Telegram delivery",
              "Cancel anytime",
            ].map((f) => (
              <li
                key={f}
                style={{
                  fontSize: 14,
                  color: T.sub,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{ color: T.green, fontSize: 14, fontWeight: 700 }}
                >
                  &#10003;
                </span>
                {f}
              </li>
            ))}
          </ul>
          <PrimaryButton
            href="/auth"
            style={{
              display: "block",
              width: "100%",
              padding: "14px 24px",
              boxSizing: "border-box",
              background: `linear-gradient(135deg, ${T.green}, #1e7a3a)`,
            }}
          >
            Start free — 3 day trial
          </PrimaryButton>
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: T.muted,
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            No charge for 3 days. Cancel anytime.
          </p>
        </GlassCard>
      </section>

      {/* ─── Final CTA ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "40px 32px 80px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <GlassCard style={{ padding: "44px 40px" }}>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 28,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 16px",
              lineHeight: 1.3,
            }}
          >
            Stop scrolling.
            <br />
            Start engaging.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: T.sub,
              margin: "0 0 32px",
              lineHeight: 1.65,
            }}
          >
            Let Pingi handle the noise so you can focus on the conversations
            that matter. AI drafts, you decide.
          </p>
          <PrimaryButton href="/auth">Start free — 3 day trial</PrimaryButton>
        </GlassCard>
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
            style={{
              display: "flex",
              gap: 24,
              fontSize: 13,
              color: T.muted,
            }}
          >
            <Link
              href="/auth"
              style={{ color: T.muted, textDecoration: "none" }}
            >
              Sign up
            </Link>
            <Link
              href="/pricing"
              style={{ color: T.muted, textDecoration: "none" }}
            >
              Pricing
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
