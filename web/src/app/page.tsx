"use client";

import { useRouter } from "next/navigation";

const T = {
  ink: "#1a1a1a",
  sub: "#6b6b6b",
  muted: "#9a9a9a",
};

export default function LandingPage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        textAlign: "center",
        background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 800,
          marginBottom: 20,
          fontFamily: "'Instrument Serif', Georgia, serif",
          color: "#fff",
          background: "linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        P
      </div>

      <h1
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 36,
          fontWeight: 400,
          color: T.ink,
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
        }}
      >
        Pingi
      </h1>

      <p
        style={{
          fontSize: 17,
          color: T.sub,
          margin: "0 0 6px",
          fontWeight: 400,
        }}
      >
        Your AI engagement agent
      </p>

      <p
        style={{
          fontSize: 14,
          color: T.muted,
          margin: "0 0 36px",
          maxWidth: 360,
          lineHeight: 1.65,
        }}
      >
        Stop missing replies across Gmail, X, and LinkedIn. Pingi monitors your
        engagement, prioritizes what matters, and drafts replies that sound like
        you.
      </p>

      <button
        onClick={() => router.push("/auth")}
        style={{
          padding: "14px 44px",
          borderRadius: 12,
          border: "none",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          background: "linear-gradient(135deg, #1a1a1a, #333)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Get started
      </button>
    </div>
  );
}
