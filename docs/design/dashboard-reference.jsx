import { useState, useRef, useEffect } from "react";

/*
  Pingi AI — Liquid Glass Dashboard Demo
  
  Design direction: Apple Vision Pro glass morphism meets warm neutrals.
  Frosted translucent cards, soft depth shadows, subtle gradient meshes,
  no harsh borders, smooth radius everywhere, gentle hover lifts.
*/

const T = {
  ink: "#1a1a1a",
  sub: "#6b6b6b",
  muted: "#9a9a9a",
  bg: "#f2f0ec",
  glass: "rgba(255,255,255,0.55)",
  glassHover: "rgba(255,255,255,0.72)",
  glassSolid: "rgba(255,255,255,0.85)",
  border: "rgba(255,255,255,0.45)",
  borderSub: "rgba(0,0,0,0.06)",
  red: "#e04a32",
  redSoft: "rgba(224,74,50,0.08)",
  amber: "#c08a1e",
  amberSoft: "rgba(192,138,30,0.08)",
  green: "#2a8a4a",
  greenSoft: "rgba(42,138,74,0.08)",
  blue: "#3066d4",
  blueSoft: "rgba(48,102,212,0.08)",
  accent: "#e04a32",
};

const font = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const serif = "'Instrument Serif', Georgia, serif";

const glass = {
  background: T.glass,
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: `1px solid ${T.border}`,
  boxShadow: "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
};

const glassCard = {
  ...glass,
  borderRadius: 16,
  padding: "14px 16px",
  transition: "all 0.2s ease",
};

const btn = (bg, color) => ({
  padding: "8px 18px", borderRadius: 10, border: "none",
  background: bg, color, fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "all 0.15s",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
});

// ─── Shared ───
function StepBar({ current, steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "14px 24px", ...glass, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, flexShrink: 0,
            background: i < current ? T.green : i === current ? T.ink : "rgba(0,0,0,0.08)",
            color: i <= current ? "#fff" : T.muted,
          }}>{i < current ? "\u2713" : i + 1}</div>
          <span style={{ fontSize: 12, fontWeight: i === current ? 600 : 400, color: i === current ? T.ink : T.muted, marginLeft: 6, whiteSpace: "nowrap" }}>{s}</span>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 1.5, background: i < current ? `${T.green}40` : "rgba(0,0,0,0.06)", margin: "0 12px", borderRadius: 1 }} />}
        </div>
      ))}
    </div>
  );
}

function LandingScreen({ onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: 40, textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, fontWeight: 800, marginBottom: 20, fontFamily: serif, color: "#fff",
        background: "linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}>P</div>
      <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 400, color: T.ink, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Pingi</h1>
      <p style={{ fontSize: 17, color: T.sub, margin: "0 0 6px", fontWeight: 400 }}>Your AI engagement agent</p>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 36px", maxWidth: 360, lineHeight: 1.65 }}>
        Stop missing replies across Gmail, X, and LinkedIn. Pingi monitors your engagement, prioritizes what matters, and drafts replies that sound like you.
      </p>
      <button onClick={onNext} style={{
        padding: "14px 44px", borderRadius: 12, border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
        background: "linear-gradient(135deg, #1a1a1a, #333)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>Get started free</button>
      <p style={{ fontSize: 12, color: T.muted, marginTop: 12 }}>Free: 1 platform, 10 drafts/month</p>
    </div>
  );
}

function SignUpScreen({ onNext }) {
  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1px solid rgba(0,0,0,0.08)`, fontSize: 14, color: T.ink,
    outline: "none", background: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(8px)", boxSizing: "border-box",
    transition: "border 0.15s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: 32 }}>
      <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 4px" }}>Create your account</h2>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>Takes about 2 minutes</p>
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ fontSize: 12, fontWeight: 500, color: T.sub, display: "block", marginBottom: 5 }}>Name</label><input placeholder="Your name" style={inputStyle} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 500, color: T.sub, display: "block", marginBottom: 5 }}>Email</label><input placeholder="you@example.com" type="email" style={inputStyle} /></div>
        <button onClick={onNext} style={{ ...btn("linear-gradient(135deg, #1a1a1a, #333)", "#fff"), padding: "12px", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", marginTop: 2 }}>Continue</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}><div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.06)" }} /><span style={{ fontSize: 12, color: T.muted }}>or</span><div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.06)" }} /></div>
        <button onClick={onNext} style={{ padding: "12px", borderRadius: 10, ...glass, color: T.ink, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Continue with Google</button>
      </div>
    </div>
  );
}

function ConnectScreen({ onNext }) {
  const [c, setC] = useState({ gmail: false, twitter: false, linkedin: false });
  const any = Object.values(c).some(Boolean);
  const platforms = [
    { key: "gmail", name: "Gmail", desc: "Monitor emails needing reply", color: "#EA4335", letter: "G" },
    { key: "twitter", name: "X / Twitter", desc: "Track mentions and replies", color: "#000", letter: "X" },
    { key: "linkedin", name: "LinkedIn", desc: "Catch comments on posts", color: "#0A66C2", letter: "in" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: 32 }}>
      <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 4px" }}>Connect your platforms</h2>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>Where should Pingi watch?</p>
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 10 }}>
        {platforms.map(p => (
          <div key={p.key} onClick={() => setC(prev => ({ ...prev, [p.key]: !prev[p.key] }))} style={{
            ...glassCard,
            borderColor: c[p.key] ? `${T.green}50` : T.border,
            background: c[p.key] ? `rgba(42,138,74,0.06)` : T.glass,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: p.color,
              background: `${p.color}0a`,
              border: `1px solid ${p.color}15`,
            }}>{p.letter}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{p.name}</div><div style={{ fontSize: 12, color: T.muted }}>{p.desc}</div></div>
            <div style={{
              width: 22, height: 22, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
              background: c[p.key] ? T.green : "rgba(0,0,0,0.06)", color: "#fff", fontSize: 12, fontWeight: 700,
              transition: "all 0.2s",
            }}>{c[p.key] ? "\u2713" : ""}</div>
          </div>
        ))}
      </div>
      <button onClick={onNext} disabled={!any} style={{
        marginTop: 24, padding: "12px 44px", borderRadius: 10, border: "none",
        background: any ? "linear-gradient(135deg, #1a1a1a, #333)" : "rgba(0,0,0,0.06)",
        color: any ? "#fff" : T.muted, fontSize: 14, fontWeight: 600, cursor: any ? "pointer" : "default",
        boxShadow: any ? "0 4px 16px rgba(0,0,0,0.1)" : "none",
      }}>Continue</button>
    </div>
  );
}

function VoiceLearningScreen({ onNext }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { if (phase === 0) { const t = setTimeout(() => setPhase(1), 3500); return () => clearTimeout(t); } }, [phase]);

  if (phase === 0) {
    const steps = ["Reading your last 50 sent emails", "Analyzing your X replies", "Reviewing LinkedIn comments", "Learning voice patterns"];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: 32 }}>
        <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 8px" }}>Learning your voice</h2>
        <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px", maxWidth: 380, textAlign: "center" }}>Reading your actual sent messages. No forms to fill out.</p>
        <div style={{ width: "100%", maxWidth: 340 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", opacity: i <= 2 ? 1 : 0.35 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: i <= 2 ? T.green : "rgba(0,0,0,0.08)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{i <= 2 ? "\u2713" : ""}</div>
              <span style={{ fontSize: 13, color: T.ink }}>{s}...</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const previews = [
    { ctx: "Business", from: "We'd love to explore a partnership.", draft: "Appreciate you reaching out. Let's set up a call to talk specifics. Free Thursday afternoon?", note: "Direct, proposes next step" },
    { ctx: "Audience", from: "Great post, really helpful.", draft: "Thanks, glad it was useful.", note: "Brief, matches energy" },
    { ctx: "Question", from: "How do you handle rate limiting on the Twitter API?", draft: "We batch requests and cache aggressively. Free tier gives 1,500 reads/month, workable if you poll every 5 min.", note: "Specific, shares real detail" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: 32 }}>
      <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 4px" }}>Voice learned</h2>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 6px" }}>Here's how Pingi would draft for you. Fine-tune anytime in Settings.</p>
      <p style={{ fontSize: 12, color: T.muted, margin: "0 0 24px" }}>Based on your sent messages across platforms</p>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
        {previews.map((p, i) => (
          <div key={i} style={{ ...glassCard }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.blue, background: T.blueSoft, padding: "3px 10px", borderRadius: 8 }}>{p.ctx}</span>
              <span style={{ fontSize: 11, color: T.muted }}>{p.note}</span>
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 8, padding: "8px 12px", background: "rgba(0,0,0,0.025)", borderRadius: 10 }}>
              Incoming: "{p.from}"
            </div>
            <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.55, padding: "10px 12px", background: T.greenSoft, borderRadius: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.green, display: "block", marginBottom: 4 }}>Pingi draft</span>
              {p.draft}
            </div>
          </div>
        ))}
      </div>
      <button onClick={onNext} style={{
        marginTop: 24, padding: "12px 44px", borderRadius: 10, border: "none",
        background: "linear-gradient(135deg, #1a1a1a, #333)", color: "#fff",
        fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}>Looks good, let's go</button>
    </div>
  );
}

function ScanningScreen({ onNext }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const stages = [
    { label: "Finding unreplied messages", result: "4 emails, 2 mentions, 1 comment" },
    { label: "Classifying by context", result: "Business, questions, audience tagged" },
    { label: "Drafting replies in your voice", result: "7 drafts ready" },
  ];
  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => { if (p >= 100) { clearInterval(t); setTimeout(onNext, 500); return 100; } setStage(Math.min(Math.floor((p + 3) / 34), 2)); return p + 3; });
    }, 70);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", padding: 32 }}>
      <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, color: T.ink, margin: "0 0 28px" }}>Preparing your inbox</h2>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", marginBottom: 28, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #1a1a1a, #555)", width: `${progress}%`, transition: "width 0.1s" }} />
        </div>
        {stages.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, marginBottom: 6, ...( i <= stage ? glassCard : { opacity: 0.3, padding: "10px 14px" }) }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: i < stage ? T.green : i === stage ? T.ink : "rgba(0,0,0,0.08)", color: "#fff" }}>{i < stage ? "\u2713" : i + 1}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: T.ink }}>{s.label}</div>{i < stage && <div style={{ fontSize: 11, color: T.green, fontWeight: 500 }}>{s.result}</div>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inbox ───
const URGENCY = { red: { color: T.red, bg: T.redSoft }, amber: { color: T.amber, bg: T.amberSoft }, green: { color: T.green, bg: T.greenSoft } };
const CTX_LABEL = { BUSINESS_OPPORTUNITY: "Business", PROFESSIONAL_NETWORK: "Network", AUDIENCE_ENGAGEMENT: "Audience", KNOWLEDGE_EXCHANGE: "Question", OPERATIONAL: "Ops", PERSONAL: "Personal" };
const PLAT = { gmail: { l: "G", c: "#EA4335" }, twitter: { l: "X", c: "#000" }, linkedin: { l: "in", c: "#0A66C2" } };
function getAge(d) { const m = Math.floor((Date.now() - d.getTime()) / 60000); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}d`; }

const ITEMS = [
  { id: "1", platform: "twitter", urgency: "red", context: "BUSINESS_OPPORTUNITY", priorityScore: 9, authorName: "Sarah Chen", authorHandle: "@sarahchen_vc", originalText: "Love what you're building with Pingi. We're looking at tools in this space for our portfolio companies. Would love to chat about your roadmap.", contextText: "Your tweet about AI tools", detectedAt: new Date(Date.now() - 14*3600000), draftText: "Appreciate that, Sarah. Happy to walk you through what we're building. Free Thursday or Friday for a quick call?" },
  { id: "2", platform: "gmail", urgency: "red", context: "OPERATIONAL", priorityScore: 8, authorName: "James Park", authorHandle: "james@startup.io", originalText: "Following up on the partnership proposal from last week. Let me know your thoughts.", contextText: "Re: Partnership Proposal", detectedAt: new Date(Date.now() - 18*3600000), draftText: "Hey James, took a closer look at the proposal. The integration angle makes sense. Let's do a call Thursday to go through specifics." },
  { id: "3", platform: "linkedin", urgency: "amber", context: "KNOWLEDGE_EXCHANGE", priorityScore: 7, authorName: "Maria Rodriguez", originalText: "How do you handle classification when a message is ambiguous between a lead and casual interest?", contextText: "Your post: Building an AI engagement agent", detectedAt: new Date(Date.now() - 6*3600000), draftText: "We score each message 1-10 based on sender profile, language, and past engagement. Ambiguous ones land around 5-6 so they still surface without false urgency." },
  { id: "4", platform: "twitter", urgency: "amber", context: "AUDIENCE_ENGAGEMENT", priorityScore: 6, authorName: "Dev Patel", authorHandle: "@devpatel_eng", originalText: "The urgency escalation idea is solid. Way better than just marking things unread.", detectedAt: new Date(Date.now() - 8*3600000), draftText: "Thanks Dev. Yeah, time-since-received turned out to be a better signal than read/unread." },
  { id: "5", platform: "gmail", urgency: "green", context: "PROFESSIONAL_NETWORK", priorityScore: 7, authorName: "Yuki Tanaka", authorHandle: "yuki@designstudio.co", originalText: "I'm a product designer following your project. Would love to collaborate on the UI/UX.", contextText: "Collaboration opportunity", detectedAt: new Date(Date.now() - 2*3600000), draftText: "Hey Yuki, good to hear from you. Always looking to connect with designers who get the product. Got a portfolio I can check out?" },
  { id: "6", platform: "linkedin", urgency: "green", context: "AUDIENCE_ENGAGEMENT", priorityScore: 3, authorName: "Alex Kim", originalText: "Great post. Totally agree.", detectedAt: new Date(Date.now() - 3600000), draftText: "Thanks, Alex." },
  { id: "7", platform: "twitter", urgency: "green", context: "AUDIENCE_ENGAGEMENT", priorityScore: 4, authorName: "Lisa Wang", authorHandle: "@lisawang_pm", originalText: "Just discovered @pingi_ai. The engagement tracking angle is smarter than just auto-replies.", detectedAt: new Date(Date.now() - 2700000), draftText: "Appreciate that, Lisa. That's the core idea, tracking what you're missing matters more than generating replies." },
];

function ChatEditPanel({ item, onClose, onSend }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState(item.draftText);
  const ref = useRef(null), iRef = useRef(null);
  useEffect(() => { iRef.current?.focus(); }, []);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [messages]);
  const submit = async () => {
    if (!input.trim() || thinking) return;
    const msg = input.trim(); setInput(""); setMessages(p => [...p, { role: "user", text: msg }]); setThinking(true);
    await new Promise(r => setTimeout(r, 1100));
    let nd = draft; const l = msg.toLowerCase();
    if (l.includes("casual") || l.includes("chill")) nd = draft.replace(/Thank you/g, "Thanks").replace(/\.$/, "");
    else if (l.includes("shorter") || l.includes("brief")) { const s = draft.split(/[.!?]+/).filter(s => s.trim()); nd = s.slice(0, Math.ceil(s.length / 2)).join(". ").trim() + "."; }
    else if (l.includes("formal")) nd = draft.replace(/Hey /g, "Hi ").replace(/Thanks/g, "Thank you");
    else if (l.includes("mention") || l.includes("add") || l.includes("include")) { const d = msg.replace(/^(mention|add|include|say)\s+(that\s+)?/i, ""); nd = draft.replace(/[.!?]\s*$/, "") + `. ${d.charAt(0).toUpperCase() + d.slice(1)}.`; }
    else if (l.includes("question") || l.includes("ask")) nd = draft.replace(/[.]\s*$/, "") + ". What's your take?";
    else nd = draft.replace(/[.!?]\s*$/, "") + ". " + msg.charAt(0).toUpperCase() + msg.slice(1) + ".";
    setDraft(nd); setMessages(p => [...p, { role: "ai", text: "Updated:", draft: nd }]); setThinking(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(12px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, maxHeight: "80vh",
        background: "rgba(255,255,255,0.82)", backdropFilter: "blur(40px) saturate(1.5)",
        borderRadius: 20, display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset",
        overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 600, fontSize: 15, color: T.ink }}>Reply to {item.authorName}</div><div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>Tell Pingi how to adjust</div></div>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", width: 28, height: 28, borderRadius: 8, fontSize: 14, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
        </div>
        <div style={{ padding: "10px 20px", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 12, color: T.sub }}>
          <span style={{ fontWeight: 600, color: T.blue }}>{CTX_LABEL[item.context]}</span>
          <span style={{ margin: "0 8px", color: "rgba(0,0,0,0.1)" }}>|</span>"{item.originalText.slice(0, 100)}..."
        </div>
        <div style={{ padding: "12px 20px", background: T.greenSoft, borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.green, marginBottom: 5 }}>Current draft</div>
          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.55 }}>{draft}</div>
        </div>
        <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8, minHeight: 80 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: T.muted, fontSize: 13 }}>
              <div style={{ marginBottom: 12 }}>How should Pingi adjust this?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {["Make it casual", "Shorter", "More formal", "Mention we met at the conference", "Ask a follow-up question"].map(s => (
                  <button key={s} onClick={() => setInput(s)} style={{
                    padding: "5px 12px", borderRadius: 20, ...glass, fontSize: 11, color: T.sub, cursor: "pointer",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "80%", padding: "8px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.5,
                ...(m.role === "user" ? { background: T.ink, color: "#fff", borderBottomRightRadius: 4 } : { ...glass, borderBottomLeftRadius: 4 }),
              }}>
                {m.text}
                {m.draft && <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 10, background: T.greenSoft, fontSize: 12, color: T.ink }}>{m.draft}</div>}
              </div>
            </div>
          ))}
          {thinking && <div style={{ ...glass, padding: "8px 14px", borderRadius: 14, borderBottomLeftRadius: 4, alignSelf: "flex-start", fontSize: 13, color: T.muted }}><span className="pp">Thinking...</span></div>}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input ref={iRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder='"make it shorter" or "mention our last meeting"' style={{
              flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)",
              fontSize: 13, outline: "none", background: "rgba(0,0,0,0.025)", fontFamily: font,
            }} />
            <button onClick={submit} disabled={!input.trim()} style={{
              width: 38, height: 38, borderRadius: 12, border: "none",
              background: input.trim() ? T.ink : "rgba(0,0,0,0.06)", color: "#fff",
              fontWeight: 600, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>{"\u2191"}</button>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, borderTop: "1px solid rgba(0,0,0,0.04)", marginTop: 2 }}>
            <button onClick={onClose} style={{ ...btn("transparent", T.sub), border: "1px solid rgba(0,0,0,0.08)" }}>Cancel</button>
            <button onClick={() => onSend(draft)} style={{ ...btn(T.green, "#fff"), padding: "9px 22px", borderRadius: 12, boxShadow: `0 2px 8px ${T.green}30` }}>Send reply</button>
          </div>
        </div>
      </div>
      <style>{`.pp{animation:pp 1.5s infinite}@keyframes pp{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

function InboxScreen() {
  const [items] = useState(ITEMS);
  const [tab, setTab] = useState("pending");
  const [expanded, setExpanded] = useState(null);
  const [sentItems, setSentItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [platFilter, setPlatFilter] = useState("all");

  const pending = items.filter(i => !sentItems.find(s => s.id === i.id));
  const filtered = pending.filter(i => filter === "all" ? true : filter === "urgent" ? i.urgency === "red" : true).filter(i => platFilter === "all" || i.platform === platFilter);
  const sorted = [...filtered].sort((a, b) => b.priorityScore - a.priorityScore);
  const uc = { red: pending.filter(i => i.urgency === "red").length, amber: pending.filter(i => i.urgency === "amber").length, green: pending.filter(i => i.urgency === "green").length };

  const handleSend = (id, draft) => {
    setSentItems(p => [...p, { ...items.find(i => i.id === id), sentAt: new Date(), finalDraft: draft || items.find(i => i.id === id)?.draftText }]);
    setExpanded(null);
  };

  return (
    <div>
      <header style={{
        ...glass, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none",
        padding: "0 20px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 12, fontWeight: 800, fontFamily: serif,
            background: "linear-gradient(135deg, #1a1a1a, #333)",
          }}>P</div>
          <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: T.ink }}>Pingi</span>
        </div>
        <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 3 }}>
          {[
            { k: "pending", l: "Pending", count: pending.length, countColor: T.red },
            { k: "sent", l: "Sent", count: sentItems.length, countColor: T.green },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: tab === t.k ? "rgba(255,255,255,0.85)" : "transparent",
              color: tab === t.k ? T.ink : T.muted,
              boxShadow: tab === t.k ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              {t.l}
              {t.count > 0 && <span style={{ background: t.countColor, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{t.count}</span>}
            </button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "pending" && (
          <>
            {/* Urgency cards */}
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Urgent", sub: "12h+", count: uc.red, color: T.red },
                { label: "Getting stale", sub: "4-12h", count: uc.amber, color: T.amber },
                { label: "Fresh", sub: "under 4h", count: uc.green, color: T.green },
              ].map(u => (
                <div key={u.label} style={{
                  flex: 1, borderRadius: 16, padding: "14px 16px",
                  background: "rgba(255,255,255,0.45)",
                  backdropFilter: "blur(20px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.03), 0 0.5px 0 rgba(255,255,255,0.7) inset",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: u.color, boxShadow: `0 0 6px ${u.color}40` }} />
                    <div style={{ fontSize: 22, fontWeight: 700, color: u.color, fontFamily: serif }}>{u.count}</div>
                  </div>
                  <div style={{ fontSize: 11, color: T.sub }}>{u.label}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{u.sub}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ k: "all", l: "All" }, { k: "urgent", l: "Urgent only" }].map(t => (
                  <button key={t.k} onClick={() => setFilter(t.k)} style={{
                    padding: "5px 14px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: filter === t.k ? T.ink : "rgba(0,0,0,0.04)",
                    color: filter === t.k ? "#fff" : T.muted,
                  }}>{t.l}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[{ k: "all", l: "All" }, { k: "gmail", l: "G" }, { k: "twitter", l: "X" }, { k: "linkedin", l: "in" }].map(t => (
                  <button key={t.k} onClick={() => setPlatFilter(t.k)} style={{
                    padding: "4px 10px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: platFilter === t.k ? T.blueSoft : "transparent",
                    color: platFilter === t.k ? T.blue : T.muted,
                  }}>{t.l}</button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.length === 0 ? (
                <div style={{ ...glassCard, padding: "44px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>All clear</div>
                  <div style={{ fontSize: 13, color: T.muted }}>Nothing pending. You're caught up.</div>
                </div>
              ) : sorted.map(item => {
                const u = URGENCY[item.urgency], pl = PLAT[item.platform], exp = expanded === item.id;
                return (
                  <div key={item.id} onClick={() => setExpanded(exp ? null : item.id)} style={{
                    borderRadius: 18,
                    padding: "14px 18px",
                    cursor: "pointer",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    background: exp ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(28px) saturate(1.5)",
                    WebkitBackdropFilter: "blur(28px) saturate(1.5)",
                    border: "1px solid rgba(255,255,255,0.55)",
                    boxShadow: exp
                      ? `0 12px 40px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(255,255,255,0.3)`
                      : `0 2px 12px rgba(0,0,0,0.03), 0 0.5px 0 rgba(255,255,255,0.7) inset`,
                    transform: exp ? "translateY(-2px) scale(1.005)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      {/* Urgency glow dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: u.color,
                        boxShadow: `0 0 6px ${u.color}50, 0 0 12px ${u.color}20`,
                      }} />
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: pl.c,
                        background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.5)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}>{pl.l}</div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: T.ink, flex: 1 }}>
                        {item.authorName}
                        {item.authorHandle && <span style={{ fontWeight: 400, fontSize: 11, color: T.muted, marginLeft: 4 }}>{item.authorHandle}</span>}
                      </span>
                      <span style={{
                        padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 500,
                        background: "rgba(255,255,255,0.6)", color: T.sub,
                        border: "1px solid rgba(255,255,255,0.4)",
                        backdropFilter: "blur(8px)",
                      }}>{CTX_LABEL[item.context]}</span>
                      <span style={{ fontSize: 11, color: u.color, fontWeight: 600, opacity: 0.85 }}>{getAge(item.detectedAt)}</span>
                    </div>
                    {item.contextText && <div style={{ fontSize: 10, color: T.muted, marginLeft: 44, marginBottom: 3 }}>Re: {item.contextText}</div>}
                    <div style={{
                      fontSize: 13, color: T.ink, marginLeft: 44, lineHeight: 1.55,
                      ...(exp ? {} : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
                    }}>"{item.originalText}"</div>
                    {exp && (
                      <div style={{ marginTop: 14, marginLeft: 44 }}>
                        {item.draftText && (
                          <div style={{
                            background: "rgba(42,138,74,0.04)",
                            borderRadius: 14, padding: "12px 16px", marginBottom: 14,
                            border: "1px solid rgba(42,138,74,0.08)",
                            backdropFilter: "blur(8px)",
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: T.green, marginBottom: 5, opacity: 0.8 }}>Pingi draft / {CTX_LABEL[item.context]} voice</div>
                            <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.55 }}>{item.draftText}</div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={e => { e.stopPropagation(); handleSend(item.id); }} style={{
                            ...btn(T.green, "#fff"),
                            borderRadius: 12,
                            boxShadow: `0 2px 8px ${T.green}30`,
                          }}>Send</button>
                          <button onClick={e => { e.stopPropagation(); setEditing(item); }} style={{
                            ...btn("rgba(255,255,255,0.7)", T.sub),
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.5)",
                            backdropFilter: "blur(8px)",
                          }}>Edit with Pingi</button>
                          <button onClick={e => { e.stopPropagation(); handleSend(item.id); }} style={{
                            ...btn("rgba(255,255,255,0.4)", T.muted),
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.3)",
                          }}>Skip</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "sent" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sentItems.length === 0 ? (
              <div style={{ ...glassCard, padding: "44px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>No sent replies yet</div>
                <div style={{ fontSize: 13, color: T.muted }}>Replies you send will appear here for 7 days.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Last 7 days</div>
                {sentItems.map(item => {
                  const pl = PLAT[item.platform];
                  return (
                    <div key={item.id} style={{
                      borderRadius: 16, padding: "14px 18px",
                      background: "rgba(255,255,255,0.45)",
                      backdropFilter: "blur(20px) saturate(1.4)",
                      border: "1px solid rgba(255,255,255,0.5)",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.03), 0 0.5px 0 rgba(255,255,255,0.7) inset",
                      opacity: 0.9,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: `${pl.c}08`, color: pl.c }}>{pl.l}</div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: T.ink, flex: 1 }}>{item.authorName}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 500, background: T.greenSoft, color: T.green }}>Sent</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.muted, marginLeft: 34, marginBottom: 6 }}>"{item.originalText.slice(0, 80)}..."</div>
                      <div style={{ fontSize: 13, color: T.ink, marginLeft: 34, lineHeight: 1.5, padding: "8px 12px", background: "rgba(0,0,0,0.02)", borderRadius: 10 }}>
                        Your reply: "{item.finalDraft || item.draftText}"
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {editing && <ChatEditPanel item={editing} onClose={() => setEditing(null)} onSend={d => { handleSend(editing.id, d); setEditing(null); }} />}
    </div>
  );
}

export default function PingiDemo() {
  const [step, setStep] = useState(0);
  const next = () => setStep(s => s + 1);
  return (
    <div style={{
      minHeight: "100vh", fontFamily: font, display: "flex", flexDirection: "column",
      background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                   radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                   radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
    }}>
      {step > 0 && step < 5 && <StepBar current={step - 1} steps={["Sign Up", "Connect", "Learn Voice", "Inbox"]} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {step === 0 && <LandingScreen onNext={next} />}
        {step === 1 && <SignUpScreen onNext={next} />}
        {step === 2 && <ConnectScreen onNext={next} />}
        {step === 3 && <VoiceLearningScreen onNext={next} />}
        {step === 4 && <ScanningScreen onNext={next} />}
        {step >= 5 && <InboxScreen />}
      </div>
    </div>
  );
}
