"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

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

// ─── Keyframes injected once ───

const keyframesCSS = `
@keyframes slideInMsg {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
@keyframes dash-flow {
  0% { stroke-dashoffset: 16; }
  100% { stroke-dashoffset: 0; }
}
@keyframes float-phone {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 16,
        color: T.sub,
        margin: "0 0 40px",
        lineHeight: 1.6,
        maxWidth: 520,
      }}
    >
      {children}
    </p>
  );
}

// ─── SVG Icons ───

function GmailIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="#F4F4F4" stroke="#E0E0E0" strokeWidth="0.5"/>
      <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M2 6l3 2.5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22 6l-3 2.5" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function TelegramIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={T.tgBlue}/>
      <path d="M6.5 12.3l2.3.8 1 3c.1.2.3.3.5.2l1.4-1.2 2.7 2c.3.2.6 0 .7-.3l2-9.5c.1-.4-.2-.6-.5-.5L6.5 11.5c-.4.1-.4.6 0 .8z" fill="white"/>
    </svg>
  );
}

function SlackIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 15a2 2 0 01-2-2 2 2 0 012-2h2v2a2 2 0 01-2 2z" fill="#E01E5A"/>
      <path d="M9 15a2 2 0 002-2V7a2 2 0 10-4 0v6a2 2 0 002 2z" fill="#E01E5A"/>
      <path d="M9 6a2 2 0 002-2 2 2 0 00-2-2 2 2 0 00-2 2v2h2z" fill="#36C5F0"/>
      <path d="M9 9a2 2 0 00-2-2H1a2 2 0 100 4h6a2 2 0 002-2z" fill="#36C5F0"/>
      <path d="M18 9a2 2 0 012 2 2 2 0 01-2 2h-2V9a2 2 0 012-2z" fill="#2EB67D"/>
      <path d="M15 9a2 2 0 00-2 2v6a2 2 0 104 0v-6a2 2 0 00-2-2z" fill="#2EB67D"/>
      <path d="M15 20a2 2 0 01-2-2v-2h2a2 2 0 110 4z" fill="#ECB22E"/>
      <path d="M15 15a2 2 0 002-2h6a2 2 0 110 4h-6a2 2 0 01-2-2z" fill="#ECB22E"/>
    </svg>
  );
}

// ─── Telegram Phone Mockup ───

const mockMessages = [
  {
    sender: "Pingi",
    text: "New email from Sarah Chen",
    sub: "Re: Q3 partnership proposal",
    draft: "Hi Sarah, thanks for the detailed proposal. I've reviewed the terms and I'm aligned on the revenue share structure. Let me loop in our ops team for next steps.",
    delay: 0,
  },
  {
    sender: "Pingi",
    text: "New email from Marcus Webb",
    sub: "Follow-up: API integration timeline",
    draft: "Hey Marcus, good question. We're targeting end of month for the v2 endpoints. I'll send over the updated spec by Friday.",
    delay: 2,
  },
  {
    sender: "Pingi",
    text: "New email from Lisa Park",
    sub: "Invoice #4821 — quick question",
    draft: "Hi Lisa, the discrepancy is from the mid-cycle plan upgrade. I'll have finance send a corrected invoice today.",
    delay: 4,
  },
];

function TelegramMockup() {
  return (
    <div
      style={{
        width: 280,
        maxWidth: "100%",
        animation: "float-phone 4s ease-in-out infinite",
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.8) inset",
          overflow: "hidden",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            background: T.tgBlue,
            padding: "10px 16px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              fontFamily: serif,
            }}
          >
            P
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              Pingi
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 10,
                lineHeight: 1.2,
              }}
            >
              online
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div
          style={{
            padding: "12px 10px",
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "rgba(230,225,218,0.3)",
          }}
        >
          {mockMessages.map((msg, i) => (
            <div
              key={i}
              style={{
                animation: `slideInMsg 0.5s ease-out ${msg.delay}s both`,
              }}
            >
              {/* Message bubble */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px 12px 12px 4px",
                  padding: "8px 10px",
                  maxWidth: "92%",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.tgBlue,
                    marginBottom: 3,
                  }}
                >
                  {msg.sender}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.ink,
                    lineHeight: 1.3,
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.muted,
                    marginTop: 2,
                  }}
                >
                  {msg.sub}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.sub,
                    marginTop: 6,
                    padding: "5px 7px",
                    background: "rgba(0,0,0,0.03)",
                    borderRadius: 6,
                    lineHeight: 1.4,
                  }}
                >
                  {msg.draft.length > 80
                    ? msg.draft.slice(0, 80) + "..."
                    : msg.draft}
                </div>
                {/* Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  {["Send", "Edit", "Skip"].map((btn) => (
                    <div
                      key={btn}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "5px 0",
                        borderRadius: 6,
                        color:
                          btn === "Send"
                            ? "#fff"
                            : btn === "Edit"
                              ? T.tgBlue
                              : T.muted,
                        background:
                          btn === "Send"
                            ? T.tgBlue
                            : btn === "Edit"
                              ? `${T.tgBlue}15`
                              : "rgba(0,0,0,0.04)",
                        border:
                          btn === "Edit"
                            ? `1px solid ${T.tgBlue}30`
                            : "1px solid transparent",
                      }}
                    >
                      {btn}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Platform Flow Diagram ───

function PlatformFlow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "40px 20px 0",
      }}
    >
      {/* Gmail */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
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
          <GmailIcon size={28} />
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontWeight: 500 }}>
          Gmail
        </div>
      </div>

      {/* Animated line 1 */}
      <svg width="80" height="20" style={{ overflow: "visible", margin: "0 -4px", marginBottom: 18 }}>
        <line
          x1="0" y1="10" x2="80" y2="10"
          stroke={T.muted}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          style={{ animation: "dash-flow 0.8s linear infinite" }}
        />
        <polygon points="76,6 82,10 76,14" fill={T.muted} />
      </svg>

      {/* Pingi */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)",
            boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 800,
            fontFamily: serif,
            color: "#fff",
          }}
        >
          P
        </div>
        <div style={{ fontSize: 11, color: T.ink, marginTop: 6, fontWeight: 600 }}>
          Pingi
        </div>
      </div>

      {/* Animated line 2 */}
      <svg width="80" height="20" style={{ overflow: "visible", margin: "0 -4px", marginBottom: 18 }}>
        <line
          x1="0" y1="10" x2="80" y2="10"
          stroke={T.tgBlue}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          style={{ animation: "dash-flow 0.8s linear infinite" }}
        />
        <polygon points="76,6 82,10 76,14" fill={T.tgBlue} />
      </svg>

      {/* Telegram */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
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
          <TelegramIcon size={28} />
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontWeight: 500 }}>
          Telegram
        </div>
      </div>

      {/* Dotted line to Slack (coming soon) */}
      <svg width="60" height="20" style={{ overflow: "visible", margin: "0 -4px", marginBottom: 18 }}>
        <line
          x1="0" y1="10" x2="60" y2="10"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
      </svg>

      {/* Slack */}
      <div style={{ textAlign: "center", opacity: 0.45 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SlackIcon size={28} />
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontWeight: 500 }}>
          Soon
        </div>
      </div>
    </div>
  );
}

// ─── Counting animation ───

function useCountUp(
  target: number,
  duration: number,
  decimals: number = 0
): [React.RefCallback<HTMLDivElement>, string] {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState("0");
  const hasRun = useRef(false);

  const animate = useCallback(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setValue(current.toFixed(decimals));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      elRef.current = node;
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            animate();
            observer.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [animate]
  );

  return [setRef, value];
}

function CountStat({
  target,
  suffix,
  label,
  color,
  duration = 1500,
  decimals = 0,
}: {
  target: number;
  suffix: string;
  label: string;
  color: string;
  duration?: number;
  decimals?: number;
}) {
  const [setRef, value] = useCountUp(target, duration, decimals);
  return (
    <div ref={setRef} style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: serif,
          fontSize: 36,
          fontWeight: 400,
          color,
          lineHeight: 1,
        }}
      >
        {value}
        {suffix}
      </div>
      <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// ─── How it works steps ───

const steps = [
  {
    number: "1",
    title: "Connect Gmail",
    description:
      "One-click OAuth. Pingi gets read-only access to scan for messages that need a reply. Nothing is stored except what matters.",
  },
  {
    number: "2",
    title: "Get notified in Telegram",
    description:
      "When someone needs a reply, Pingi sends you a notification with the original message and an AI-drafted response in your voice.",
  },
  {
    number: "3",
    title: "Send, Edit, or Skip",
    description:
      "Tap Send to reply instantly. Tap Edit to adjust the tone. Tap Skip to ignore. Three buttons, zero context switching.",
  },
];

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
          padding: "60px 32px 20px",
          maxWidth: 1060,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 48,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Left: text */}
        <div style={{ flex: "1 1 380px", maxWidth: 520, textAlign: "left" }}>
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
            Stop missing the replies that matter
          </h1>
          <p
            style={{
              fontSize: 18,
              color: T.sub,
              margin: "0 0 32px",
              lineHeight: 1.65,
              maxWidth: 460,
            }}
          >
            Pingi monitors your Gmail, filters out noise, and sends you only the
            messages that need a reply — with an AI draft ready to send. All
            through Telegram.
          </p>
          <PrimaryButton
            href="/auth"
            style={{ fontSize: 16, padding: "16px 52px" }}
          >
            Get started free
          </PrimaryButton>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 14 }}>
            Free forever. No credit card required.
          </p>
        </div>

        {/* Right: phone mockup */}
        <div style={{ flex: "0 0 auto" }}>
          <TelegramMockup />
        </div>
      </section>

      {/* ─── Platform Flow ─── */}
      <PlatformFlow />

      {/* ─── The Problem ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "60px 32px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <GlassCard style={{ padding: "40px 36px" }}>
          <p
            style={{
              fontFamily: serif,
              fontSize: 28,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 16px",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            You get 100+ emails a day.
            <br />
            Only 3 to 5 need a reply.
            <br />
            The rest is noise.
          </p>
          <p
            style={{
              fontSize: 17,
              color: T.green,
              margin: 0,
              fontWeight: 600,
            }}
          >
            Pingi finds the signal.
          </p>
        </GlassCard>
      </section>

      {/* ─── How it works ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "60px 32px",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <SectionHeading>How it works</SectionHeading>
        <SectionSub>Three steps. Under two minutes to set up.</SectionSub>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {steps.map((step) => (
            <GlassCard key={step.number}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: T.ink,
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  margin: "0 auto 16px",
                }}
              >
                {step.number}
              </div>
              <h3
                style={{
                  fontFamily: serif,
                  fontSize: 20,
                  fontWeight: 400,
                  color: T.ink,
                  margin: "0 0 8px",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: T.sub,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {step.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ─── Before / After ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "60px 32px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <SectionHeading>The difference Pingi makes</SectionHeading>
        <SectionSub>
          Real numbers from users who stopped letting emails pile up.
        </SectionSub>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          {/* Before */}
          <GlassCard
            style={{
              background: "rgba(0,0,0,0.02)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: T.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 20px",
              }}
            >
              Before Pingi
            </p>
            <CountStat
              target={61}
              suffix="%"
              label="Response rate"
              color={T.ink}
            />
            <CountStat
              target={11}
              suffix="h"
              label="Avg reply time"
              color={T.ink}
              duration={1200}
            />
            <CountStat
              target={23}
              suffix=""
              label="Missed / month"
              color={T.ink}
              duration={1000}
            />
          </GlassCard>

          {/* After */}
          <GlassCard
            style={{
              background: T.greenSoft,
              border: `1px solid ${T.green}20`,
            }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: T.green,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 20px",
              }}
            >
              After Pingi
            </p>
            <CountStat
              target={94}
              suffix="%"
              label="Response rate"
              color={T.green}
            />
            <CountStat
              target={2.3}
              suffix="h"
              label="Avg reply time"
              color={T.green}
              duration={1200}
              decimals={1}
            />
            <CountStat
              target={0}
              suffix=""
              label="Missed"
              color={T.green}
              duration={800}
            />
          </GlassCard>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "60px 32px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <SectionHeading>Simple pricing</SectionHeading>
        <SectionSub>Start free. Upgrade when you need more.</SectionSub>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            textAlign: "left",
          }}
        >
          {/* Free */}
          <GlassCard>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: T.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 4px",
              }}
            >
              Free
            </p>
            <div
              style={{
                fontFamily: serif,
                fontSize: 36,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 20px",
              }}
            >
              $0
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
                margin: "0 0 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                "1 Gmail account",
                "5 AI drafts per month",
                "Telegram notifications",
                "Smart email filtering",
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
            <Link
              href="/auth"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 24px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(255,255,255,0.6)",
                color: T.ink,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: sans,
              }}
            >
              Get started
            </Link>
          </GlassCard>

          {/* Pro */}
          <GlassCard
            style={{
              border: `1.5px solid ${T.green}40`,
              position: "relative",
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
              Pro
            </p>
            <div
              style={{
                fontFamily: serif,
                fontSize: 36,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 20px",
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
                margin: "0 0 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                "Unlimited Gmail accounts",
                "200 AI drafts per month",
                "Telegram notifications",
                "Weekly engagement reports",
                "X and Slack coming soon",
                "Priority support",
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
                padding: "12px 24px",
                boxSizing: "border-box",
                background: `linear-gradient(135deg, ${T.green}, #1e7a3a)`,
              }}
            >
              Start free trial
            </PrimaryButton>
          </GlassCard>
        </div>
      </section>

      {/* ─── Built for ADHD ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "60px 32px 80px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <GlassCard style={{ padding: "44px 40px" }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              margin: "0 0 16px",
            }}
          >
            Built for ADHD
          </p>
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
            Not a productivity hack.
            <br />
            An accessibility tool.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: T.sub,
              margin: "0 0 32px",
              lineHeight: 1.65,
            }}
          >
            Pingi removes the friction that makes replying hard. No inbox to
            open. No threads to parse. No blank-page paralysis. Just a
            notification, a draft, and three buttons.
          </p>
          <PrimaryButton href="/auth">Get started free</PrimaryButton>
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
