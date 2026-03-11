"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Design tokens (dark mode) ───

const T = {
  bg: "#0A0A0B",
  surface: "rgba(255,255,255,0.03)",
  glass: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  white: "#FAFAFA",
  sub: "#8B8B8E",
  muted: "#55555A",
  accent: "#8B5CF6",
  accentBlue: "#3B82F6",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.12)",
  tgBlue: "#229ED9",
};

const sans = "'DM Sans', sans-serif";

const keyframesCSS = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes typingBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes pulseRing {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(139,92,246,0); }
}
@keyframes checkScale {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes dash-flow {
  0% { stroke-dashoffset: 16; }
  100% { stroke-dashoffset: 0; }
}
`;

// ─── Scroll-triggered fade-in ───

function useFadeIn(): [React.RefCallback<HTMLElement>, boolean] {
  const elRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    elRef.current = node;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(node);
    observerRef.current = obs;
  }, []);

  return [setRef, visible];
}

function FadeSection({
  children,
  style,
  id,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  id?: string;
}) {
  const [ref, visible] = useFadeIn();
  return (
    <section
      ref={ref}
      id={id}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── Glass card ───

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
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "32px 28px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── SVG Icons ───

function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M13.5 10.5L18.5 4.5H17L12.9 9.6L9.5 4.5H5L10.3 12.9L5 19.5H6.5L11 13.8L14.5 19.5H19L13.5 10.5Z"
        fill="white"
      />
    </svg>
  );
}

function EnvelopeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M2 7l10 7 10-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TelegramIcon({ size = 24 }: { size?: number }) {
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

// ─── Interactive Demo ───

function InteractiveDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timings = [3000, 2500, 3000, 3000];
    const timer = setTimeout(() => setStep((s) => (s + 1) % 4), timings[step]);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
      {/* Phone frame — dark */}
      <div
        style={{
          width: 340,
          maxWidth: "100%",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${T.border}`,
          borderRadius: 36,
          padding: "20px 18px 28px",
          boxShadow: "0 16px 64px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.06)",
          position: "relative" as const,
          overflow: "hidden",
          minHeight: 440,
        }}
      >
        {/* Status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "2px 6px 14px",
            fontSize: 11,
            color: T.sub,
            fontWeight: 600,
          }}
        >
          <span>9:41</span>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.white }} />
          <span style={{ fontSize: 10 }}>100%</span>
        </div>

        {/* App header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 2px 14px",
            borderBottom: `1px solid ${T.border}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentBlue})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            P
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.white }}>Pingi</span>
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

        {/* Steps */}
        <div style={{ minHeight: 310, position: "relative" as const }}>
          {/* Step 0: Tweet */}
          <div
            style={{
              opacity: step >= 0 ? 1 : 0,
              transform: step >= 0 ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.5s ease",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.sub,
                  }}
                >
                  PG
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>Paul Graham</div>
                  <div style={{ fontSize: 11, color: T.muted }}>@paulg</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: T.sub, margin: 0, lineHeight: 1.5 }}>
                The best way to come up with startup ideas is to notice problems in your own life.
                The tricky part is that you have to be working on something for the problems to
                become apparent.
              </p>
            </div>
          </div>

          {/* Step 1: Drafting */}
          <div
            style={{
              opacity: step >= 1 ? 1 : 0,
              transform: step >= 1 ? "translateY(0)" : "translateY(14px)",
              transition: "all 0.5s ease",
              transitionDelay: step >= 1 ? "0.15s" : "0s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: step === 1 ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)",
                border: `1px solid ${step === 1 ? "rgba(139,92,246,0.2)" : "transparent"}`,
                borderRadius: 10,
                marginBottom: 12,
                transition: "all 0.3s",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: step >= 2 ? T.green : "rgba(139,92,246,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.3s",
                }}
              >
                {step >= 2 ? (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                ) : (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: T.accent,
                      animation: step === 1 ? "pulseRing 1s ease infinite" : "none",
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 12, color: step >= 2 ? T.green : T.sub, fontWeight: 500 }}>
                {step >= 2 ? "AI draft ready" : "Pingi AI drafting reply"}
                {step === 1 && (
                  <span style={{ display: "inline-block", width: 14, animation: "typingBlink 1s infinite" }}>
                    ...
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Step 2: Telegram card */}
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
                background: "rgba(34,158,217,0.08)",
                border: `1px solid rgba(34,158,217,0.15)`,
                borderRadius: "14px 14px 14px 4px",
                padding: "14px 16px",
                marginBottom: 10,
              }}
            >
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: "0 0 12px", lineHeight: 1.5 }}>
                &quot;This resonates. I built my last startup from a problem I hit running my
                freelance practice — couldn&apos;t find a good way to track client communication.
                The &apos;working on something&apos; part is what most people skip.&quot;
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {["Post", "Edit", "Skip"].map((label, i) => (
                  <button
                    key={label}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: "none",
                      background:
                        i === 0 && step === 3
                          ? T.green
                          : i === 0
                            ? "rgba(34,158,217,0.15)"
                            : "rgba(255,255,255,0.06)",
                      color: i === 0 && step === 3 ? "#fff" : i === 0 ? T.tgBlue : T.sub,
                      fontSize: 13,
                      fontWeight: i === 0 ? 600 : 500,
                      fontFamily: sans,
                      cursor: "default",
                      opacity: i > 0 && step === 3 ? 0.3 : 1,
                      transition: "all 0.3s",
                    }}
                  >
                    {i === 0 && step === 3 ? "Posted" : label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Confirmation */}
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
                background: T.greenDim,
                padding: "10px 20px",
                borderRadius: 10,
                border: `1px solid rgba(34,197,94,0.2)`,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="9" fill={T.green} />
                <path d="M5.5 9l2.5 2.5L12.5 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>Your reply is live</span>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingTop: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: step === i ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: step === i ? T.white : "rgba(255,255,255,0.12)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Flow diagram (dark) ───

function FlowDiagram({ sourceIcon, sourceLabel }: { sourceIcon: React.ReactNode; sourceLabel: string }) {
  const iconBox: React.CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${T.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "20px 0 4px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={iconBox}>{sourceIcon}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontWeight: 500 }}>{sourceLabel}</div>
      </div>

      <svg width="44" height="20" style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}>
        <line x1="0" y1="10" x2="44" y2="10" stroke={T.muted} strokeWidth="1" strokeDasharray="4 4" style={{ animation: "dash-flow 0.8s linear infinite" }} />
        <polygon points="40,6 46,10 40,14" fill={T.muted} />
      </svg>

      <div style={{ textAlign: "center" }}>
        <div style={{ ...iconBox, background: `linear-gradient(135deg, ${T.accent}, ${T.accentBlue})`, border: "none", boxShadow: `0 4px 20px rgba(139,92,246,0.25)` }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>P</span>
        </div>
        <div style={{ fontSize: 10, color: T.white, marginTop: 4, fontWeight: 600 }}>Pingi</div>
      </div>

      <svg width="44" height="20" style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}>
        <line x1="0" y1="10" x2="44" y2="10" stroke={T.tgBlue} strokeWidth="1" strokeDasharray="4 4" style={{ animation: "dash-flow 0.8s linear infinite" }} />
        <polygon points="40,6 46,10 40,14" fill={T.tgBlue} />
      </svg>

      <div style={{ textAlign: "center" }}>
        <div style={iconBox}><TelegramIcon size={20} /></div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontWeight: 500 }}>Telegram</div>
      </div>
    </div>
  );
}

// ─── Main page ───

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: sans, color: T.white }}>
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
          position: "relative" as const,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentBlue})`,
            }}
          >
            P
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: T.white }}>Pingi</span>
        </div>
        <Link
          href="/auth"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: T.sub,
            textDecoration: "none",
            padding: "8px 20px",
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: "transparent",
            transition: "border-color 0.2s, color 0.2s",
          }}
        >
          Sign in
        </Link>
      </nav>

      {/* ─── Hero ─── */}
      <section
        style={{
          padding: "100px 32px 80px",
          maxWidth: 820,
          margin: "0 auto",
          textAlign: "center",
          position: "relative" as const,
        }}
      >
        {/* Gradient glow behind headline */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            background: `radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)`,
            pointerEvents: "none",
            filter: "blur(60px)",
          }}
        />

        <h1
          style={{
            fontSize: "clamp(38px, 5.5vw, 60px)",
            fontWeight: 700,
            color: T.white,
            margin: "0 0 24px",
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            position: "relative" as const,
          }}
        >
          Engage with thought leaders
          <br />
          in 10 seconds
        </h1>
        <p
          style={{
            fontSize: 18,
            color: T.sub,
            margin: "0 auto 44px",
            lineHeight: 1.65,
            maxWidth: 560,
            position: "relative" as const,
          }}
        >
          Pingi watches X accounts you care about, drafts AI replies, and sends them to Telegram.
          Review, tap Post. Your brand grows effortlessly.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            position: "relative" as const,
          }}
        >
          <Link
            href="/auth"
            style={{
              display: "inline-block",
              padding: "14px 36px",
              borderRadius: 10,
              background: T.white,
              color: T.bg,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: sans,
            }}
          >
            Start free trial
          </Link>
          <a
            href="#demo"
            style={{
              display: "inline-block",
              padding: "14px 36px",
              borderRadius: 10,
              background: "transparent",
              color: T.sub,
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: sans,
              border: `1px solid ${T.border}`,
              transition: "border-color 0.2s",
            }}
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ─── Interactive Demo ─── */}
      <FadeSection
        id="demo"
        style={{
          padding: "60px 32px 40px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <InteractiveDemo />
        <p
          style={{
            textAlign: "center",
            fontSize: 15,
            color: T.muted,
            marginTop: 28,
            lineHeight: 1.5,
          }}
        >
          From tweet to engagement in 10 seconds. No doomscrolling required.
        </p>
      </FadeSection>

      {/* ─── How it works (3 steps) ─── */}
      <FadeSection
        style={{
          padding: "80px 32px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: 32,
            fontWeight: 700,
            color: T.white,
            margin: "0 0 48px",
            letterSpacing: "-0.02em",
          }}
        >
          How it works
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              step: "1",
              title: "Pick who to watch",
              desc: "Add @paulg, @naval, @sama — anyone on X. Pingi monitors their posts 24/7.",
              icon: (
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {["PG", "NR", "SA"].map((initials) => (
                    <div
                      key={initials}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${T.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.sub,
                      }}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
              ),
            },
            {
              step: "2",
              title: "AI drafts your reply",
              desc: "Pingi reads the post, understands context, and writes a thoughtful reply in your voice.",
              icon: (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: T.accent,
                        opacity: 0.4 + i * 0.3,
                      }}
                    />
                  ))}
                </div>
              ),
            },
            {
              step: "3",
              title: "Review & post from Telegram",
              desc: "Get a notification with the draft. Tap Post, Edit, or Skip. Done in seconds.",
              icon: <TelegramIcon size={28} />,
            },
          ].map((item) => (
            <GlassCard key={item.step} style={{ textAlign: "center", padding: "36px 24px" }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 16,
                }}
              >
                Step {item.step}
              </div>
              <div style={{ marginBottom: 16, minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.icon}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: T.white,
                  margin: "0 0 8px",
                }}
              >
                {item.title}
              </h3>
              <p style={{ fontSize: 14, color: T.sub, margin: 0, lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </FadeSection>

      {/* ─── Two Products ─── */}
      <FadeSection
        style={{
          padding: "60px 32px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: 32,
            fontWeight: 700,
            color: T.white,
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
          }}
        >
          Two agents. One subscription.
        </h2>
        <p
          style={{
            textAlign: "center",
            fontSize: 16,
            color: T.sub,
            margin: "0 auto 40px",
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          Everything runs through Telegram — no new apps to learn.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {/* X Engage */}
          <GlassCard
            style={{
              padding: "36px 30px",
              display: "flex",
              flexDirection: "column",
              border: `1px solid rgba(139,92,246,0.2)`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -11,
                right: 20,
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentBlue})`,
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
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <XIcon size={22} />
            </div>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: T.white,
                margin: "0 0 10px",
              }}
            >
              X Engage Agent
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.sub,
                margin: "0 0 4px",
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              Track thought leaders. Get AI-drafted replies when they post.
              Review and engage from Telegram. Build your brand without scrolling.
            </p>
            <FlowDiagram sourceIcon={<XIcon size={18} />} sourceLabel="X" />
          </GlassCard>

          {/* Inbox */}
          <GlassCard
            style={{
              padding: "36px 30px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <EnvelopeIcon size={22} />
            </div>
            <h3
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: T.white,
                margin: "0 0 10px",
              }}
            >
              Inbox Agent
            </h3>
            <p
              style={{
                fontSize: 15,
                color: T.sub,
                margin: "0 0 4px",
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              Never miss an important email. AI filters noise, drafts replies,
              and sends only what matters to Telegram. Tap Send, Edit, or Skip.
            </p>
            <FlowDiagram sourceIcon={<EnvelopeIcon size={18} />} sourceLabel="Gmail" />
          </GlassCard>
        </div>
      </FadeSection>

      {/* ─── Human in the Loop ─── */}
      <FadeSection
        style={{
          padding: "60px 32px",
          maxWidth: 680,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <GlassCard style={{ padding: "52px 40px", border: `1px solid ${T.border}` }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: T.white,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Not a bot. You&apos;re always in control.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: T.sub,
              margin: 0,
              lineHeight: 1.65,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Every reply is reviewed by you before it goes live. AI drafts, you decide.
            Authentic engagement, zero spam.
          </p>
        </GlassCard>
      </FadeSection>

      {/* ─── Social Proof ─── */}
      <FadeSection
        style={{
          textAlign: "center",
          padding: "20px 32px 60px",
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        <p style={{ fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.8 }}>
          Track and engage with anyone on X —{" "}
          {["@paulg", "@naval", "@sama", "@levelsio", "@elonmusk"].map((handle, i, arr) => (
            <span key={handle}>
              <span style={{ color: T.sub, fontWeight: 500 }}>{handle}</span>
              {i < arr.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </FadeSection>

      {/* ─── Pricing ─── */}
      <FadeSection
        style={{
          textAlign: "center",
          padding: "40px 32px 80px",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <GlassCard
          style={{
            border: `1px solid rgba(139,92,246,0.2)`,
            position: "relative",
            textAlign: "left",
            padding: "44px 36px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -12,
              right: 20,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentBlue})`,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 14px",
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
              color: T.accent,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              margin: "0 0 4px",
            }}
          >
            Pingi Pro
          </p>
          <div style={{ fontSize: 44, fontWeight: 700, color: T.white, margin: "0 0 28px" }}>
            $19
            <span style={{ fontSize: 16, color: T.muted, fontWeight: 400 }}> / month</span>
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 32px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
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
                  gap: 10,
                }}
              >
                <span style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/auth"
            style={{
              display: "block",
              width: "100%",
              padding: "14px 24px",
              borderRadius: 10,
              background: T.white,
              color: T.bg,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              textAlign: "center",
              fontFamily: sans,
              boxSizing: "border-box",
            }}
          >
            Start free trial
          </Link>
          <p style={{ textAlign: "center", fontSize: 13, color: T.muted, marginTop: 14, marginBottom: 0 }}>
            No charge for 3 days. Cancel anytime.
          </p>
        </GlassCard>
      </FadeSection>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: "32px",
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
                width: 22,
                height: 22,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 800,
                color: "#fff",
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentBlue})`,
              }}
            >
              P
            </div>
            <span style={{ fontSize: 13, color: T.muted }}>Pingi AI</span>
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
            <Link href="/auth" style={{ color: T.muted, textDecoration: "none" }}>Sign up</Link>
            <Link href="/pricing" style={{ color: T.muted, textDecoration: "none" }}>Pricing</Link>
          </div>
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
            {new Date().getFullYear()} Pingi AI
          </p>
        </div>
      </footer>
    </div>
  );
}
