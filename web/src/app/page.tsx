"use client";

import Link from "next/link";

const T = {
  ink: "#1a1a1a",
  sub: "#6b6b6b",
  muted: "#9a9a9a",
  glass: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.45)",
  green: "#2a8a4a",
  greenSoft: "rgba(42,138,74,0.08)",
  bg: "rgba(242,240,236,1)",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

const background = `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
  radial-gradient(ellipse at 50% 50%, ${T.bg} 0%, rgba(234,230,223,1) 100%)`;

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

// ─── How it works step ───

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

// ─── Stats ───

const beforeStats = [
  { value: "61%", label: "Response rate" },
  { value: "11h", label: "Avg reply time" },
  { value: "23", label: "Missed / month" },
];

const afterStats = [
  { value: "90%+", label: "Response rate" },
  { value: "3h", label: "Avg reply time" },
  { value: "0", label: "Missed" },
];

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background,
        fontFamily: sans,
      }}
    >
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
            border: `1px solid rgba(0,0,0,0.08)`,
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
          textAlign: "center",
          padding: "80px 32px 60px",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(36px, 5vw, 56px)",
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
            margin: "0 auto 36px",
            maxWidth: 540,
            lineHeight: 1.65,
          }}
        >
          Pingi monitors your Gmail, filters out noise, and sends you only the
          messages that need a reply — with an AI draft ready to send. All
          through Telegram.
        </p>
        <PrimaryButton href="/auth" style={{ fontSize: 16, padding: "16px 52px" }}>
          Get started free
        </PrimaryButton>
        <p
          style={{
            fontSize: 13,
            color: T.muted,
            marginTop: 14,
          }}
        >
          Free forever. No credit card required.
        </p>
      </section>

      {/* ─── The Problem ─── */}
      <section
        style={{
          textAlign: "center",
          padding: "60px 32px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <GlassCard
          style={{
            padding: "40px 36px",
          }}
        >
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
            {beforeStats.map((stat) => (
              <div key={stat.label} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 32,
                    fontWeight: 400,
                    color: T.ink,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T.muted,
                    marginTop: 4,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
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
            {afterStats.map((stat) => (
              <div key={stat.label} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 32,
                    fontWeight: 400,
                    color: T.green,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T.sub,
                    marginTop: 4,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
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
              <span style={{ fontSize: 16, color: T.muted, fontFamily: sans }}>
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
                    style={{
                      color: T.green,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
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
                border: `1px solid rgba(0,0,0,0.1)`,
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
              Popular
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
              <span style={{ fontSize: 16, color: T.muted, fontFamily: sans }}>
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
                    style={{
                      color: T.green,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
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
            <span style={{ fontSize: 13, color: T.muted }}>
              Pingi AI
            </span>
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
