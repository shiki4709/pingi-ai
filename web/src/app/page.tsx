"use client";

import Link from "next/link";
import { useRef, useState, useCallback } from "react";

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

function XIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#000"/>
      <path d="M13.5 10.5L18.5 4.5H17L12.9 9.6L9.5 4.5H5L10.3 12.9L5 19.5H6.5L11 13.8L14.5 19.5H19L13.5 10.5Z" fill="white" strokeWidth="0"/>
    </svg>
  );
}

// ─── Mini flow diagram for product cards ───

function FlowDiagram({ sourceIcon, sourceLabel }: { sourceIcon: React.ReactNode; sourceLabel: string }) {
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
      {/* Source */}
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
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontWeight: 500 }}>
          {sourceLabel}
        </div>
      </div>

      {/* Arrow 1 */}
      <svg width="48" height="20" style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}>
        <line x1="0" y1="10" x2="48" y2="10" stroke={T.muted} strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: "dash-flow 0.8s linear infinite" }} />
        <polygon points="44,6 50,10 44,14" fill={T.muted} />
      </svg>

      {/* Pingi */}
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
        <div style={{ fontSize: 10, color: T.ink, marginTop: 4, fontWeight: 600 }}>
          Pingi
        </div>
      </div>

      {/* Arrow 2 */}
      <svg width="48" height="20" style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}>
        <line x1="0" y1="10" x2="48" y2="10" stroke={T.tgBlue} strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: "dash-flow 0.8s linear infinite" }} />
        <polygon points="44,6 50,10 44,14" fill={T.tgBlue} />
      </svg>

      {/* Telegram */}
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
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontWeight: 500 }}>
          Telegram
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
          Your AI engagement agent
        </h1>
        <p
          style={{
            fontSize: 18,
            color: T.sub,
            margin: "0 auto 40px",
            lineHeight: 1.65,
            maxWidth: 560,
          }}
        >
          Stop missing important emails. Start building your online presence.
          Pingi handles both — through Telegram.
        </p>
        <PrimaryButton
          href="/auth"
          style={{ fontSize: 16, padding: "16px 52px" }}
        >
          Get started free
        </PrimaryButton>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 14 }}>
          3-day free trial. No credit card required.
        </p>
      </section>

      {/* ─── Two Product Cards ─── */}
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
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 24,
          }}
        >
          {/* Inbox Agent */}
          <GlassCard style={{ padding: "36px 32px", display: "flex", flexDirection: "column" }}>
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
              For busy founders, creators, people with ADHD
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
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              You get 100+ emails a day. Only 3-5 need a reply. You miss the ones that matter.
            </p>
            <p
              style={{
                fontSize: 14,
                color: T.sub,
                margin: "0 0 4px",
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              Pingi monitors your Gmail, filters noise, drafts replies, and sends only what matters to Telegram. Tap Send, Edit, or Skip.
            </p>
            <FlowDiagram sourceIcon={<GmailIcon size={22} />} sourceLabel="Gmail" />
          </GlassCard>

          {/* Engage Agent */}
          <GlassCard style={{ padding: "36px 32px", display: "flex", flexDirection: "column" }}>
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
              For creators, founders building personal brand
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
              Engage Agent
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.ink,
                margin: "0 0 12px",
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              You want to engage on X but don&apos;t have time to scroll, read, and write thoughtful replies.
            </p>
            <p
              style={{
                fontSize: 14,
                color: T.sub,
                margin: "0 0 4px",
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              Pingi watches accounts you care about, drafts smart replies when they post, and sends them to Telegram. Review, edit, and post in 10 seconds.
            </p>
            <FlowDiagram sourceIcon={<XIcon size={22} />} sourceLabel="X" />
          </GlassCard>
        </div>
      </section>

      {/* ─── One subscription. Both agents. ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "40px 32px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <GlassCard style={{ padding: "40px 36px" }}>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 28,
              fontWeight: 400,
              color: T.ink,
              margin: "0 0 12px",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            One subscription. Both agents.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: T.sub,
              margin: "0 0 8px",
              lineHeight: 1.5,
            }}
          >
            $19/mo unlocks unlimited Gmail monitoring and X engagement.
            Everything runs through Telegram — no new apps to learn.
          </p>
          <p
            style={{
              fontSize: 15,
              color: T.green,
              margin: 0,
              fontWeight: 600,
            }}
          >
            AI writes. You approve.
          </p>
        </GlassCard>
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
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <SectionHeading>One plan. Full access.</SectionHeading>
        <SectionSub>Try everything free for 3 days. Then $19/mo.</SectionSub>

        <GlassCard
          style={{
            border: `1.5px solid ${T.green}40`,
            position: "relative",
            textAlign: "left",
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
              {" "}/ month
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
              "Unlimited Gmail accounts",
              "Unlimited X accounts to watch",
              "Unlimited AI-drafted replies",
              "Inbox Agent + Engage Agent",
              "Smart email filtering",
              "Weekly engagement reports",
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
            Start 3-day free trial
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
