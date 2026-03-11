"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Design tokens ───
// Warm editorial palette — tinted neutrals, single accent
// Contrast-checked against #FAFAF7:
// ink      #1A1917 = 17.4:1 ✓ AAA
// body     #4A4A46 = 8.3:1  ✓ AAA
// muted    #8C8C86 = 3.8:1  ✓ AA large text
// accent   #C2410C = 4.6:1  ✓ AA

const T = {
  bg: "#FAFAF7",
  surface: "#F3F2EE",
  surfaceAlt: "#ECEAE4",
  ink: "#1A1917",
  body: "#4A4A46",
  muted: "#8C8C86",
  dim: "#B5B5AE",
  accent: "#C2410C",
  accentHover: "#9A3412",
  accentSoft: "#FFF7ED",
  border: "#E5E4DF",
  borderLight: "#EDECE8",
  green: "#16A34A",
  greenSoft: "#F0FDF4",
  tgBlue: "#38BDF8",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const keyframesCSS = `
@keyframes typingBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes dash-flow {
  0% { stroke-dashoffset: 16; }
  100% { stroke-dashoffset: 0; }
}

html { scroll-behavior: smooth; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  html { scroll-behavior: auto; }
}

a:focus-visible, button:focus-visible {
  outline: 2px solid ${T.accent};
  outline-offset: 2px;
  border-radius: 4px;
}
`;

// ─── Scroll-triggered fade-in ───

function useFadeIn(): [React.RefCallback<HTMLElement>, boolean] {
  const elRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    if (obsRef.current) { obsRef.current.disconnect(); obsRef.current = null; }
    elRef.current = node;
    if (!node) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(node);
    obsRef.current = obs;
  }, []);

  return [setRef, visible];
}

function FadeSection({ children, style, id, label }: { children: React.ReactNode; style?: React.CSSProperties; id?: string; label?: string }) {
  const [ref, visible] = useFadeIn();
  return (
    <section
      ref={ref}
      id={id}
      aria-label={label}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.7s cubic-bezier(0.25,1,0.5,1), transform 0.7s cubic-bezier(0.25,1,0.5,1)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── SVG Icons — flat, no gradients ───

function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="X platform">
      <rect width="24" height="24" rx="5" fill={T.ink} />
      <path d="M13.5 10.5L18.5 4.5H17L12.9 9.6L9.5 4.5H5L10.3 12.9L5 19.5H6.5L11 13.8L14.5 19.5H19L13.5 10.5Z" fill="white" />
    </svg>
  );
}

function EnvelopeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="Email">
      <rect x="2" y="4" width="20" height="16" rx="3" stroke={T.body} strokeWidth="1.5" fill="none" />
      <path d="M2 7l10 7 10-7" stroke={T.body} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TelegramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="Telegram">
      <circle cx="12" cy="12" r="11" fill={T.tgBlue} />
      <path d="M6.5 12.3l2.3.8 1 3c.1.2.3.3.5.2l1.4-1.2 2.7 2c.3.2.6 0 .7-.3l2-9.5c.1-.4-.2-.6-.5-.5L6.5 11.5c-.4.1-.4.6 0 .8z" fill="white" />
    </svg>
  );
}

// ─── Interactive Demo ───

function InteractiveDemo() {
  const [step, setStep] = useState(0);
  const stepLabels = [
    "A tweet from @paulg appears",
    "Pingi AI is drafting a reply",
    "Draft reply ready with Post, Edit, Skip buttons",
    "Reply posted successfully",
  ];

  useEffect(() => {
    const timings = [3000, 2500, 3000, 3000];
    const timer = setTimeout(() => setStep((s) => (s + 1) % 4), timings[step]);
    return () => clearTimeout(timer);
  }, [step]);

  const demoGreen = "#34D399";
  const demoMuted = "#8899A6";
  const demoBody = "#B0BEC5";
  const demoHeading = "#F1F5F9";
  const demoBorderLight = "rgba(255,255,255,0.08)";

  return (
    <div
      role="region"
      aria-label="Interactive demo showing the Pingi engagement flow"
      aria-live="polite"
      style={{ position: "relative" }}
    >
      <div className="sr-only" aria-atomic="true">
        Step {step + 1} of 4: {stepLabels[step]}
      </div>

      {/* Phone frame — dark since it represents Telegram */}
      <div
        aria-hidden="true"
        style={{
          width: 320,
          maxWidth: "100%",
          margin: "0 auto",
          background: "#17181C",
          border: `1px solid #2A2B30`,
          borderRadius: 32,
          padding: "18px 16px 24px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)",
          position: "relative" as const,
          overflow: "hidden",
          minHeight: 420,
        }}
      >
        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 6px 12px", fontSize: 11, color: demoMuted, fontWeight: 600 }}>
          <span>9:41</span>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
          <span style={{ fontSize: 10 }}>100%</span>
        </div>

        {/* App header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px 12px", borderBottom: `1px solid ${demoBorderLight}`, marginBottom: 14 }}>
          <div
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: T.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#fff",
            }}
          >
            P
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: demoHeading }}>Pingi</span>
          <div style={{ width: 5, height: 5, borderRadius: 3, background: demoGreen, marginLeft: -2 }} />
        </div>

        {/* Steps */}
        <div style={{ minHeight: 300, position: "relative" as const }}>
          {/* Step 0: Tweet */}
          <div style={{ opacity: step >= 0 ? 1 : 0, transform: step >= 0 ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s cubic-bezier(0.25,1,0.5,1)" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${demoBorderLight}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: demoMuted }}>
                  PG
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: demoHeading }}>Paul Graham</div>
                  <div style={{ fontSize: 10, color: demoMuted }}>@paulg</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: demoBody, margin: 0, lineHeight: 1.5 }}>
                The best way to come up with startup ideas is to notice problems in your own life.
                The tricky part is that you have to be working on something for the problems to become apparent.
              </p>
            </div>
          </div>

          {/* Step 1: Drafting */}
          <div style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s cubic-bezier(0.25,1,0.5,1)", transitionDelay: step >= 1 ? "0.1s" : "0s" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px",
                background: step === 1 ? "rgba(194,65,12,0.08)" : "rgba(194,65,12,0.04)",
                border: `1px solid ${step === 1 ? "rgba(194,65,12,0.2)" : "transparent"}`,
                borderRadius: 8, marginBottom: 10, transition: "all 0.3s",
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 8, background: step >= 2 ? demoGreen : "rgba(194,65,12,0.25)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}>
                {step >= 2 ? (
                  <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                ) : (
                  <div style={{ width: 5, height: 5, borderRadius: 3, background: T.accent }} />
                )}
              </div>
              <span style={{ fontSize: 11, color: step >= 2 ? demoGreen : demoBody, fontWeight: 500 }}>
                {step >= 2 ? "Draft ready" : "Drafting reply"}
                {step === 1 && <span style={{ display: "inline-block", width: 12, animation: "typingBlink 1s infinite" }}>...</span>}
              </span>
            </div>
          </div>

          {/* Step 2: Telegram card */}
          <div style={{ opacity: step >= 2 ? 1 : 0, transform: step >= 2 ? "translateX(0)" : "translateX(16px)", transition: "all 0.5s cubic-bezier(0.25,1,0.5,1)", transitionDelay: step >= 2 ? "0.1s" : "0s" }}>
            <div style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)", borderRadius: "12px 12px 12px 4px", padding: "12px 14px", marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", margin: "0 0 10px", lineHeight: 1.5 }}>
                &quot;This resonates. I built my last startup from a problem I hit running my
                freelance practice — couldn&apos;t find a good way to track client communication.
                The &apos;working on something&apos; part is what most people skip.&quot;
              </p>
              <div style={{ display: "flex", gap: 5 }}>
                {["Post", "Edit", "Skip"].map((label, i) => (
                  <span
                    key={label}
                    role="presentation"
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 6,
                      textAlign: "center" as const,
                      background: i === 0 && step === 3 ? demoGreen : i === 0 ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.05)",
                      color: i === 0 && step === 3 ? "#fff" : i === 0 ? T.tgBlue : demoMuted,
                      fontSize: 12,
                      fontWeight: i === 0 ? 600 : 400,
                      fontFamily: sans,
                      opacity: i > 0 && step === 3 ? 0.3 : 1,
                      transition: "all 0.3s",
                    }}
                  >
                    {i === 0 && step === 3 ? "Posted" : label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Confirmation */}
          <div style={{ opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? "scale(1)" : "scale(0.9)", transition: "all 0.4s cubic-bezier(0.25,1,0.5,1)", transitionDelay: step >= 3 ? "0.15s" : "0s", textAlign: "center" as const, padding: "6px 0" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.1)", padding: "8px 16px", borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="9" fill={demoGreen} />
                <path d="M5.5 9l2.5 2.5L12.5 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: demoGreen }}>Reply is live</span>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingTop: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: step === i ? 16 : 5, height: 5, borderRadius: 3, background: step === i ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.12)", transition: "all 0.3s cubic-bezier(0.25,1,0.5,1)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Flow diagram ───

function FlowDiagram({ sourceIcon, sourceLabel }: { sourceIcon: React.ReactNode; sourceLabel: string }) {
  const iconBox: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 10,
    background: T.surface, border: `1px solid ${T.border}`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "16px 0 0" }}>
      <div style={{ textAlign: "center" }}>
        <div style={iconBox}>{sourceIcon}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontWeight: 500 }}>{sourceLabel}</div>
      </div>
      <svg width="40" height="20" style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}>
        <line x1="0" y1="10" x2="40" y2="10" stroke={T.dim} strokeWidth="1" strokeDasharray="4 4" style={{ animation: "dash-flow 0.8s linear infinite" }} />
        <polygon points="36,6 42,10 36,14" fill={T.dim} />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...iconBox, background: T.accent, border: "none" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>P</span>
        </div>
        <div style={{ fontSize: 10, color: T.ink, marginTop: 4, fontWeight: 600 }}>Pingi</div>
      </div>
      <svg width="40" height="20" style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}>
        <line x1="0" y1="10" x2="40" y2="10" stroke={T.tgBlue} strokeWidth="1" strokeDasharray="4 4" style={{ animation: "dash-flow 0.8s linear infinite" }} />
        <polygon points="36,6 42,10 36,14" fill={T.tgBlue} />
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
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: sans,
        color: T.body,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        ${keyframesCSS}
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
        .skip-link {
          position: absolute; top: -100px; left: 16px;
          padding: 12px 24px; background: ${T.ink}; color: ${T.bg};
          border-radius: 6px; font-weight: 600; z-index: 100;
          text-decoration: none; font-size: 14px;
        }
        .skip-link:focus { top: 16px; }
      ` }} />

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ─── Nav ─── */}
      <nav aria-label="Main navigation" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px clamp(20px, 4vw, 48px)", maxWidth: 1080, margin: "0 auto" }}>
        <Link href="/" aria-label="Pingi home" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            aria-hidden="true"
            style={{
              width: 30, height: 30, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff",
              background: T.accent,
            }}
          >
            P
          </div>
          <span style={{ fontFamily: serif, fontSize: 19, color: T.ink }}>Pingi</span>
        </Link>
        <Link
          href="/auth"
          style={{
            fontSize: 14, fontWeight: 500, color: T.body, textDecoration: "none",
            padding: "8px 18px", borderRadius: 6,
            border: `1px solid ${T.border}`,
          }}
        >
          Sign in
        </Link>
      </nav>

      <main id="main-content">

        {/* ─── Hero ─── */}
        <section aria-label="Hero" style={{ padding: "clamp(60px, 10vw, 120px) clamp(20px, 4vw, 48px) 80px", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 48, alignItems: "center" }}>
            <div style={{ maxWidth: 600 }}>
              <p style={{
                fontSize: 13, fontWeight: 600, color: T.accent,
                textTransform: "uppercase" as const, letterSpacing: "0.08em",
                margin: "0 0 16px",
              }}>
                Agentic AI for social media engagement
              </p>
              <h1
                style={{
                  fontFamily: serif,
                  fontSize: "clamp(36px, 5vw, 56px)",
                  fontWeight: 400,
                  color: T.ink,
                  margin: "0 0 20px",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.08,
                }}
              >
                Catch the right posts early.{" "}
                <span style={{ color: T.accent }}>Reply fast.</span>
              </h1>
              <p style={{ fontSize: "clamp(16px, 1.2vw, 18px)", color: T.body, margin: "0 0 36px", lineHeight: 1.7, maxWidth: 520 }}>
                Pingi monitors the accounts that matter, surfaces posts the moment they go live,
                and drafts a reply in your voice. Review it, post it, move on.
                Grow your visibility without living on the timeline.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link
                  href="/auth"
                  style={{
                    display: "inline-block",
                    padding: "13px 32px",
                    borderRadius: 8,
                    background: T.ink,
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
                    padding: "13px 28px",
                    borderRadius: 8,
                    color: T.body,
                    fontSize: 15,
                    fontWeight: 500,
                    textDecoration: "none",
                    fontFamily: sans,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  See how it works
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Interactive Demo ─── */}
        <FadeSection id="demo" label="Product demo" style={{ padding: "0 clamp(20px, 4vw, 48px) 40px", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ background: T.surface, borderRadius: 20, padding: "clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px)", border: `1px solid ${T.borderLight}` }}>
            <InteractiveDemo />
            <p style={{ textAlign: "center", fontSize: 14, color: T.muted, marginTop: 24, marginBottom: 0 }}>
              From new post to your reply — in seconds, not hours.
            </p>
          </div>
        </FadeSection>

        {/* ─── Value Props ─── */}
        <FadeSection label="Benefits" style={{ padding: "clamp(60px, 8vw, 100px) clamp(20px, 4vw, 48px)", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(40px, 5vw, 64px)" }}>
            {[
              { num: "01", title: "Timing is leverage", desc: "Early replies get seen. Pingi monitors the accounts you track and alerts you the moment they post. You engage while the conversation is still forming, not after it has moved on." },
              { num: "02", title: "Start from a draft, not a blank page", desc: "Staring at a reply box kills momentum. Pingi drafts a response in your voice so you start with something solid, edit it into your own words, and post in seconds." },
              { num: "03", title: "Human in the loop, not auto-pilot", desc: "Nothing posts without your approval. Review every reply, edit what needs adjusting, skip what does not fit. You stay in control. No blind automation. No spam." },
            ].map((v) => (
              <div key={v.num} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "clamp(16px, 3vw, 32px)", alignItems: "baseline" }}>
                <span style={{ fontFamily: serif, fontSize: 48, fontWeight: 400, color: T.dim, lineHeight: 1 }}>
                  {v.num}
                </span>
                <div>
                  <h3 style={{ fontFamily: serif, fontSize: "clamp(22px, 2.5vw, 28px)", fontWeight: 400, color: T.ink, margin: "0 0 8px", lineHeight: 1.2 }}>
                    {v.title}
                  </h3>
                  <p style={{ fontSize: 15, color: T.body, margin: 0, lineHeight: 1.7, maxWidth: 520 }}>
                    {v.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FadeSection>

        {/* ─── Two Products ─── */}
        <FadeSection label="Products" style={{ padding: "0 clamp(20px, 4vw, 48px) clamp(60px, 8vw, 100px)", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "clamp(40px, 5vw, 64px)" }}>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(28px, 3vw, 36px)", fontWeight: 400, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              Two agents. One workflow.
            </h2>
            <p style={{ fontSize: 16, color: T.muted, margin: "0 0 clamp(32px, 4vw, 48px)", maxWidth: 420, lineHeight: 1.6 }}>
              Both deliver to Telegram. No context switching, no new apps.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {/* X Engage */}
              <div style={{ padding: "28px 24px", border: `1px solid ${T.border}`, borderRadius: 14, display: "flex", flexDirection: "column", position: "relative" }}>
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  background: T.accentSoft, color: T.accent,
                  fontSize: 10, fontWeight: 700,
                  padding: "3px 10px", borderRadius: 4,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  Popular
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.surface, border: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <XIcon size={20} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>
                  X Engage Agent
                </h3>
                <p style={{ fontSize: 14, color: T.body, margin: "0 0 4px", lineHeight: 1.65, flex: 1 }}>
                  Track founders, investors, and creators on X. Get notified the instant they post. Review an AI-drafted reply in your voice. Post in one tap or edit first.
                </p>
                <FlowDiagram sourceIcon={<XIcon size={16} />} sourceLabel="X" />
              </div>

              {/* Inbox */}
              <div style={{ padding: "28px 24px", border: `1px solid ${T.border}`, borderRadius: 14, display: "flex", flexDirection: "column" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.surface, border: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <EnvelopeIcon size={20} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>
                  Inbox Agent
                </h3>
                <p style={{ fontSize: 14, color: T.body, margin: "0 0 4px", lineHeight: 1.65, flex: 1 }}>
                  Cuts through inbox noise. Pingi filters to the emails that actually need a reply, drafts a response, and sends it to Telegram for quick review.
                </p>
                <FlowDiagram sourceIcon={<EnvelopeIcon size={16} />} sourceLabel="Gmail" />
              </div>
            </div>
          </div>
        </FadeSection>

        {/* ─── Exposure compounds ─── */}
        <FadeSection label="Why it matters" style={{ padding: "0 clamp(20px, 4vw, 48px)", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ background: T.surface, borderRadius: 16, padding: "clamp(40px, 5vw, 64px) clamp(24px, 4vw, 48px)", border: `1px solid ${T.borderLight}`, maxWidth: 640 }}>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 400, color: T.ink, margin: "0 0 12px", lineHeight: 1.2 }}>
              Exposure compounds. Showing up is the hard part.
            </h2>
            <p style={{ fontSize: 15, color: T.body, margin: 0, lineHeight: 1.7, maxWidth: 480 }}>
              Every thoughtful reply builds your reputation. Pingi removes the friction
              of finding the right conversation, thinking of what to say, and getting there on time.
              You just show up and sound like yourself.
            </p>
          </div>
        </FadeSection>

        {/* ─── Social Proof ─── */}
        <FadeSection label="Social proof" style={{ padding: "clamp(60px, 8vw, 100px) clamp(20px, 4vw, 48px)", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ maxWidth: 600 }}>
            <blockquote style={{ margin: 0, padding: "0 0 0 24px", borderLeft: `3px solid ${T.accent}` }}>
              <p style={{ fontFamily: serif, fontSize: "clamp(20px, 2.5vw, 26px)", color: T.ink, margin: "0 0 16px", lineHeight: 1.45, fontWeight: 400, fontStyle: "italic" }}>
                Replied to a Paul Graham tweet 90 seconds after it went live. First reply in the thread.
                That does not happen when you are checking X manually between meetings.
              </p>
            </blockquote>
            <p style={{ fontSize: 14, color: T.muted, margin: "24px 0 0", lineHeight: 1.8 }}>
              Track founders, investors, and creators on X —{" "}
              {["@paulg", "@naval", "@sama", "@levelsio", "@elonmusk"].map((h, i, a) => (
                <span key={h}>
                  <span style={{ color: T.body, fontWeight: 500 }}>{h}</span>
                  {i < a.length - 1 ? ", " : ""}
                </span>
              ))}
              {" "}and anyone else.
            </p>
          </div>
        </FadeSection>

        {/* ─── Pricing ─── */}
        <FadeSection label="Pricing" style={{ padding: "0 clamp(20px, 4vw, 48px) clamp(80px, 10vw, 120px)", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "clamp(40px, 5vw, 64px)" }}>
            <div style={{ maxWidth: 420 }}>
              <div style={{ display: "inline-block", background: T.accentSoft, color: T.accent, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 4, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 20 }}>
                3-day free trial
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>
                Pingi Pro
              </p>
              <div style={{ fontSize: 48, fontWeight: 700, color: T.ink, margin: "0 0 28px", fontFamily: serif }}>
                $19<span style={{ fontSize: 16, color: T.muted, fontWeight: 400 }}> / month</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "X Engage + Inbox Agent",
                  "Unlimited accounts to track",
                  "AI-drafted replies in your voice",
                  "Real-time post monitoring",
                  "Smart email filtering",
                  "Telegram delivery",
                ].map((f) => (
                  <li key={f} style={{ fontSize: 14, color: T.body, display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden="true" style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                style={{
                  display: "inline-block",
                  padding: "13px 40px",
                  borderRadius: 8,
                  background: T.ink,
                  color: T.bg,
                  fontSize: 15, fontWeight: 600,
                  textDecoration: "none",
                  fontFamily: sans,
                }}
              >
                Start free trial
              </Link>
              <p style={{ fontSize: 13, color: T.muted, marginTop: 14, marginBottom: 0 }}>
                3 days free. No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </FadeSection>

      </main>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "28px clamp(20px, 4vw, 48px)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", background: T.accent }}>
              P
            </div>
            <span style={{ fontSize: 13, color: T.muted }}>Pingi AI</span>
          </div>
          <nav aria-label="Footer navigation" style={{ display: "flex", gap: 24, fontSize: 13 }}>
            <Link href="/auth" style={{ color: T.muted, textDecoration: "none" }}>Sign up</Link>
            <Link href="/pricing" style={{ color: T.muted, textDecoration: "none" }}>Pricing</Link>
          </nav>
          <p style={{ fontSize: 12, color: T.dim, margin: 0 }}>{new Date().getFullYear()} Pingi AI</p>
        </div>
      </footer>
    </div>
  );
}
