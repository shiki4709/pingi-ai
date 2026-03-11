"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Design tokens ───

const T = {
  bg: "#0A0F1C",
  bgEnd: "#1A0B2E",
  white: "#FAFAFA",
  heading: "#F1F5F9",
  body: "#94A3B8",
  muted: "#64748B",
  dim: "#475569",
  glass: "rgba(255,255,255,0.06)",
  glassHover: "rgba(255,255,255,0.09)",
  border: "rgba(255,255,255,0.12)",
  borderLight: "rgba(255,255,255,0.08)",
  blue: "#4F46E5",
  purple: "#7C3AED",
  teal: "#06B6D4",
  pink: "#EC4899",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.15)",
  tgBlue: "#229ED9",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const gradientText = `background: linear-gradient(135deg, ${T.blue}, ${T.purple});
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;`;

const keyframesCSS = `
@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-40px, 30px) scale(0.95); }
  66% { transform: translate(25px, -25px) scale(1.05); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(35px, 35px) scale(1.08); }
}
@keyframes float4 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, -20px); }
}
@keyframes typingBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(124,58,237,0); }
}
@keyframes dash-flow {
  0% { stroke-dashoffset: 16; }
  100% { stroke-dashoffset: 0; }
}
html { scroll-behavior: smooth; }
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
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(node);
    obsRef.current = obs;
  }, []);

  return [setRef, visible];
}

function FadeSection({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  const [ref, visible] = useFadeIn();
  return (
    <section
      ref={ref}
      id={id}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── Glass card ───

function GlassCard({ children, style, glow }: { children: React.ReactNode; style?: React.CSSProperties; glow?: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        border: `1px solid ${T.border}`,
        borderRadius: 24,
        padding: "32px 28px",
        boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`,
        position: "relative" as const,
        ...(glow ? { filter: `drop-shadow(0 0 40px ${glow})` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── SVG Icons with gradient fills ───

function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="xGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={T.blue} />
          <stop offset="100%" stopColor={T.purple} />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#xGrad)" />
      <path d="M13.5 10.5L18.5 4.5H17L12.9 9.6L9.5 4.5H5L10.3 12.9L5 19.5H6.5L11 13.8L14.5 19.5H19L13.5 10.5Z" fill="white" />
    </svg>
  );
}

function EnvelopeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="envGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={T.teal} />
          <stop offset="100%" stopColor={T.blue} />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#envGrad)" strokeWidth="1.5" fill="none" />
      <path d="M2 7l10 7 10-7" stroke="url(#envGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TelegramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill={T.tgBlue} />
      <path d="M6.5 12.3l2.3.8 1 3c.1.2.3.3.5.2l1.4-1.2 2.7 2c.3.2.6 0 .7-.3l2-9.5c.1-.4-.2-.6-.5-.5L6.5 11.5c-.4.1-.4.6 0 .8z" fill="white" />
    </svg>
  );
}

// ─── Floating background orbs ───

function BackgroundOrbs() {
  const orbs = [
    { color: T.blue, size: 500, top: "5%", left: "10%", anim: "float1 20s ease-in-out infinite", opacity: 0.2 },
    { color: T.purple, size: 600, top: "30%", right: "5%", anim: "float2 25s ease-in-out infinite", opacity: 0.18 },
    { color: T.teal, size: 400, top: "60%", left: "20%", anim: "float3 22s ease-in-out infinite", opacity: 0.15 },
    { color: T.pink, size: 350, top: "80%", right: "15%", anim: "float4 18s ease-in-out infinite", opacity: 0.12 },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: o.top,
            left: o.left,
            right: (o as any).right,
            width: o.size,
            height: o.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            filter: "blur(100px)",
            opacity: o.opacity,
            animation: o.anim,
            willChange: "transform",
          }}
        />
      ))}
      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
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
    <div style={{ display: "flex", justifyContent: "center", padding: "0 16px", position: "relative" }}>
      {/* Glow behind phone */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380,
          height: 500,
          background: `radial-gradient(ellipse, ${T.purple}30 0%, ${T.blue}15 40%, transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      {/* Phone frame */}
      <div
        style={{
          width: 340,
          maxWidth: "100%",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          border: `1px solid ${T.border}`,
          borderRadius: 36,
          padding: "20px 18px 28px",
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 80px ${T.purple}15`,
          position: "relative" as const,
          overflow: "hidden",
          minHeight: 440,
          zIndex: 1,
        }}
      >
        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 6px 14px", fontSize: 11, color: T.muted, fontWeight: 600 }}>
          <span>9:41</span>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.3)" }} />
          <span style={{ fontSize: 10 }}>100%</span>
        </div>

        {/* App header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px 14px", borderBottom: `1px solid ${T.borderLight}`, marginBottom: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
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
          <span style={{ fontSize: 15, fontWeight: 600, color: T.heading }}>Pingi</span>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: T.green, marginLeft: -2 }} />
        </div>

        {/* Steps */}
        <div style={{ minHeight: 310, position: "relative" as const }}>
          {/* Step 0: Tweet */}
          <div style={{ opacity: step >= 0 ? 1 : 0, transform: step >= 0 ? "translateY(0)" : "translateY(14px)", transition: "all 0.5s ease" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${T.borderLight}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.muted }}>
                  PG
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.heading }}>Paul Graham</div>
                  <div style={{ fontSize: 11, color: T.muted }}>@paulg</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: T.body, margin: 0, lineHeight: 1.5 }}>
                The best way to come up with startup ideas is to notice problems in your own life.
                The tricky part is that you have to be working on something for the problems to become apparent.
              </p>
            </div>
          </div>

          {/* Step 1: Drafting */}
          <div style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? "translateY(0)" : "translateY(14px)", transition: "all 0.5s ease", transitionDelay: step >= 1 ? "0.15s" : "0s" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: step === 1 ? "rgba(124,58,237,0.1)" : "rgba(124,58,237,0.05)",
                border: `1px solid ${step === 1 ? "rgba(124,58,237,0.25)" : "transparent"}`,
                borderRadius: 10,
                marginBottom: 12,
                transition: "all 0.3s",
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: 9, background: step >= 2 ? T.green : "rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}>
                {step >= 2 ? (
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: T.purple, animation: step === 1 ? "pulseGlow 1s ease infinite" : "none" }} />
                )}
              </div>
              <span style={{ fontSize: 12, color: step >= 2 ? T.green : T.body, fontWeight: 500 }}>
                {step >= 2 ? "AI draft ready" : "Pingi AI drafting reply"}
                {step === 1 && <span style={{ display: "inline-block", width: 14, animation: "typingBlink 1s infinite" }}>...</span>}
              </span>
            </div>
          </div>

          {/* Step 2: Telegram card */}
          <div style={{ opacity: step >= 2 ? 1 : 0, transform: step >= 2 ? "translateX(0)" : "translateX(20px)", transition: "all 0.5s ease", transitionDelay: step >= 2 ? "0.15s" : "0s" }}>
            <div style={{ background: "rgba(34,158,217,0.08)", border: "1px solid rgba(34,158,217,0.15)", borderRadius: "14px 14px 14px 4px", padding: "14px 16px", marginBottom: 10 }}>
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
                      background: i === 0 && step === 3 ? T.green : i === 0 ? "rgba(34,158,217,0.15)" : "rgba(255,255,255,0.06)",
                      color: i === 0 && step === 3 ? "#fff" : i === 0 ? T.tgBlue : T.muted,
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
          <div style={{ opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? "scale(1)" : "scale(0.85)", transition: "all 0.4s ease", transitionDelay: step >= 3 ? "0.2s" : "0s", textAlign: "center" as const, padding: "8px 0" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.greenDim, padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(34,197,94,0.2)" }}>
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
            <div key={i} style={{ width: step === i ? 18 : 6, height: 6, borderRadius: 3, background: step === i ? T.white : "rgba(255,255,255,0.15)", transition: "all 0.3s ease" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Flow diagram ───

function FlowDiagram({ sourceIcon, sourceLabel }: { sourceIcon: React.ReactNode; sourceLabel: string }) {
  const iconBox: React.CSSProperties = {
    width: 42, height: 42, borderRadius: 11,
    background: "rgba(255,255,255,0.06)", border: `1px solid ${T.borderLight}`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "20px 0 4px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={iconBox}>{sourceIcon}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontWeight: 500 }}>{sourceLabel}</div>
      </div>
      <svg width="44" height="20" style={{ overflow: "visible", margin: "0 -2px", marginBottom: 14 }}>
        <line x1="0" y1="10" x2="44" y2="10" stroke={T.dim} strokeWidth="1" strokeDasharray="4 4" style={{ animation: "dash-flow 0.8s linear infinite" }} />
        <polygon points="40,6 46,10 40,14" fill={T.dim} />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...iconBox, background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`, border: "none", boxShadow: `0 4px 20px ${T.purple}30` }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>P</span>
        </div>
        <div style={{ fontSize: 10, color: T.heading, marginTop: 4, fontWeight: 600 }}>Pingi</div>
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

// ─── Gradient text component ───

function GradientSpan({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: `linear-gradient(135deg, ${T.blue}, ${T.purple}, ${T.pink})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

// ─── Main page ───

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${T.bg} 0%, ${T.bgEnd} 50%, ${T.bg} 100%)`,
        fontFamily: sans,
        color: T.body,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: keyframesCSS }} />
      <BackgroundOrbs />

      {/* Content wrapper above orbs */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ─── Nav ─── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 800, color: "#fff",
                background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                boxShadow: `0 4px 16px ${T.purple}30`,
              }}
            >
              P
            </div>
            <span style={{ fontFamily: serif, fontSize: 19, color: T.heading }}>Pingi</span>
          </div>
          <Link
            href="/auth"
            style={{
              fontSize: 14, fontWeight: 500, color: T.body, textDecoration: "none",
              padding: "8px 20px", borderRadius: 8,
              border: `1px solid ${T.borderLight}`,
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            Sign in
          </Link>
        </nav>

        {/* ─── Hero ─── */}
        <section style={{ padding: "100px 32px 80px", maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: serif,
              fontSize: "clamp(38px, 5.5vw, 60px)",
              fontWeight: 400,
              color: T.heading,
              margin: "0 0 24px",
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
            }}
          >
            Engage with <GradientSpan>thought leaders</GradientSpan>
            <br />
            in <GradientSpan>10 seconds</GradientSpan>
          </h1>
          <p style={{ fontSize: 18, color: T.body, margin: "0 auto 44px", lineHeight: 1.65, maxWidth: 580 }}>
            Pingi watches X accounts you care about, drafts thoughtful replies with AI,
            and sends them to your Telegram. Review, edit, post. Build your online
            presence effortlessly — without doomscrolling.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/auth"
              style={{
                display: "inline-block",
                padding: "14px 40px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: sans,
                boxShadow: `0 4px 24px ${T.purple}40`,
              }}
            >
              Start free — 3 day trial
            </Link>
            <a
              href="#demo"
              style={{
                display: "inline-block",
                padding: "14px 36px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
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
        </section>

        {/* ─── Interactive Demo ─── */}
        <FadeSection id="demo" style={{ padding: "60px 32px 40px", maxWidth: 800, margin: "0 auto" }}>
          <InteractiveDemo />
          <p style={{ textAlign: "center", fontSize: 15, color: T.muted, marginTop: 28, lineHeight: 1.5 }}>
            From tweet to engagement in 10 seconds. No doomscrolling required.
          </p>
        </FadeSection>

        {/* ─── Section divider ─── */}
        <div style={{ maxWidth: 200, margin: "40px auto", height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />

        {/* ─── Value Props ─── */}
        <FadeSection style={{ padding: "60px 32px", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { title: "No more doomscrolling", desc: "Pingi finds the conversations worth joining. You just approve." },
              { title: "10 seconds per interaction", desc: "Review the AI draft, tap Post. Done. Your brand grows while you work." },
              { title: "Human in the loop", desc: "Every reply is reviewed by you. AI drafts, you decide. Authentic engagement, not bots." },
            ].map((v) => (
              <GlassCard key={v.title} style={{ padding: "36px 28px" }}>
                <h3 style={{ fontFamily: serif, fontSize: 24, fontWeight: 400, color: T.heading, margin: "0 0 10px", lineHeight: 1.2 }}>
                  {v.title}
                </h3>
                <p style={{ fontSize: 15, color: T.body, margin: 0, lineHeight: 1.6 }}>
                  {v.desc}
                </p>
              </GlassCard>
            ))}
          </div>
        </FadeSection>

        {/* ─── Section divider ─── */}
        <div style={{ maxWidth: 200, margin: "20px auto", height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />

        {/* ─── Two Products ─── */}
        <FadeSection style={{ padding: "60px 32px", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: serif, fontSize: 34, fontWeight: 400, color: T.heading, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
              Two agents. One subscription.
            </h2>
            <p style={{ fontSize: 16, color: T.body, margin: "0 auto", maxWidth: 480, lineHeight: 1.6 }}>
              Everything runs through Telegram — no new apps to learn.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
            {/* X Engage */}
            <GlassCard
              style={{
                padding: "36px 30px",
                display: "flex",
                flexDirection: "column",
                border: `1px solid rgba(124,58,237,0.25)`,
                position: "relative",
              }}
              glow={`${T.purple}15`}
            >
              <div
                style={{
                  position: "absolute", top: -11, right: 20,
                  background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                  color: "#fff", fontSize: 10, fontWeight: 700,
                  padding: "3px 12px", borderRadius: 6,
                  letterSpacing: "0.05em", textTransform: "uppercase",
                }}
              >
                Popular
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <XIcon size={24} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 600, color: T.heading, margin: "0 0 10px" }}>
                X Engage Agent
              </h3>
              <p style={{ fontSize: 15, color: T.body, margin: "0 0 4px", lineHeight: 1.6, flex: 1 }}>
                Track @paulg, @naval, @sama. Get notified when they post. AI drafts your reply. Tap to engage.
              </p>
              <FlowDiagram sourceIcon={<XIcon size={18} />} sourceLabel="X" />
            </GlassCard>

            {/* Inbox */}
            <GlassCard style={{ padding: "36px 30px", display: "flex", flexDirection: "column" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <EnvelopeIcon size={24} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 600, color: T.heading, margin: "0 0 10px" }}>
                Inbox Agent
              </h3>
              <p style={{ fontSize: 15, color: T.body, margin: "0 0 4px", lineHeight: 1.6, flex: 1 }}>
                Never miss an important email. Pingi filters 100+ emails down to the 3-5 that need replies.
              </p>
              <FlowDiagram sourceIcon={<EnvelopeIcon size={18} />} sourceLabel="Gmail" />
            </GlassCard>
          </div>
        </FadeSection>

        {/* ─── Human in the Loop ─── */}
        <FadeSection style={{ padding: "40px 32px", maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <GlassCard style={{ padding: "52px 40px", border: `1px solid ${T.border}` }}>
            <h2 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, color: T.heading, margin: "0 0 16px", lineHeight: 1.2 }}>
              Not a bot. You&apos;re always in control.
            </h2>
            <p style={{ fontSize: 16, color: T.body, margin: 0, lineHeight: 1.65, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
              Every reply is reviewed by you before it goes live. AI drafts, you decide.
              Authentic engagement, zero spam.
            </p>
          </GlassCard>
        </FadeSection>

        {/* ─── Social Proof ─── */}
        <FadeSection style={{ textAlign: "center", padding: "40px 32px 60px", maxWidth: 700, margin: "0 auto" }}>
          <p style={{ fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.8 }}>
            Track and engage with anyone on X —{" "}
            {["@paulg", "@naval", "@sama", "@levelsio", "@elonmusk"].map((h, i, a) => (
              <span key={h}>
                <span style={{ color: T.body, fontWeight: 500 }}>{h}</span>
                {i < a.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </FadeSection>

        {/* ─── Section divider ─── */}
        <div style={{ maxWidth: 200, margin: "0 auto 20px", height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />

        {/* ─── Pricing ─── */}
        <FadeSection style={{ textAlign: "center", padding: "40px 32px 80px", maxWidth: 480, margin: "0 auto" }}>
          <GlassCard
            style={{
              border: `1px solid rgba(124,58,237,0.2)`,
              position: "relative",
              textAlign: "left",
              padding: "44px 36px",
            }}
            glow={`${T.purple}10`}
          >
            <div
              style={{
                position: "absolute", top: -12, right: 20,
                background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                color: "#fff", fontSize: 11, fontWeight: 700,
                padding: "4px 14px", borderRadius: 8,
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}
            >
              3-day free trial
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.purple, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
              Pingi Pro
            </p>
            <div style={{ fontSize: 46, fontWeight: 700, color: T.heading, margin: "0 0 28px" }}>
              $19<span style={{ fontSize: 16, color: T.muted, fontWeight: 400 }}> / month</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "X Engage Agent + Inbox Agent",
                "Unlimited accounts to watch",
                "Unlimited AI-drafted replies",
                "Smart email filtering",
                "Telegram delivery",
                "Cancel anytime",
              ].map((f) => (
                <li key={f} style={{ fontSize: 14, color: T.body, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>&#10003;</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth"
              style={{
                display: "block", width: "100%", padding: "14px 24px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
                color: "#fff", fontSize: 15, fontWeight: 600,
                textDecoration: "none", textAlign: "center",
                fontFamily: sans, boxSizing: "border-box",
                boxShadow: `0 4px 24px ${T.purple}35`,
              }}
            >
              Start free — 3 day trial
            </Link>
            <p style={{ textAlign: "center", fontSize: 13, color: T.muted, marginTop: 14, marginBottom: 0 }}>
              No charge for 3 days. Cancel anytime.
            </p>
          </GlassCard>
        </FadeSection>

        {/* ─── Footer ─── */}
        <footer style={{ borderTop: `1px solid ${T.borderLight}`, padding: "32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", background: `linear-gradient(135deg, ${T.blue}, ${T.purple})` }}>
                P
              </div>
              <span style={{ fontSize: 13, color: T.muted }}>Pingi AI</span>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
              <Link href="/auth" style={{ color: T.muted, textDecoration: "none" }}>Sign up</Link>
              <Link href="/pricing" style={{ color: T.muted, textDecoration: "none" }}>Pricing</Link>
            </div>
            <p style={{ fontSize: 12, color: T.dim, margin: 0 }}>{new Date().getFullYear()} Pingi AI</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
