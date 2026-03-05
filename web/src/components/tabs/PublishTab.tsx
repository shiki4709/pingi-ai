"use client";

import { useState, useEffect } from "react";
import type {
  PublishPlatform,
  PublishEntry,
  PublishStatus,
} from "@/types";

// ─── Platform config ───

interface PlatformConfig {
  key: PublishPlatform;
  label: string;
  color: string;
  letter: string;
  method: "direct" | "copy";
  honesty: string;
  envVars?: string[];
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    letter: "in",
    method: "direct",
    honesty: "Direct publish",
    envVars: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_PERSON_URN"],
  },
  {
    key: "twitter",
    label: "X",
    color: "#000000",
    letter: "X",
    method: "direct",
    honesty: "Direct publish",
    envVars: [
      "TWITTER_API_KEY",
      "TWITTER_API_SECRET",
      "TWITTER_ACCESS_TOKEN",
      "TWITTER_ACCESS_TOKEN_SECRET",
    ],
  },
  {
    key: "rednote",
    label: "Rednote",
    color: "#FF2442",
    letter: "R",
    method: "copy",
    honesty: "Copy & draft",
  },
  {
    key: "substack",
    label: "Substack",
    color: "#FF6719",
    letter: "S",
    method: "copy",
    honesty: "Copy & draft",
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E4405F",
    letter: "IG",
    method: "copy",
    honesty: "Copy & draft",
  },
];

const COPY_PLATFORMS = PLATFORMS.filter((p) => p.method === "copy");
const DIRECT_PLATFORMS = PLATFORMS.filter((p) => p.method === "direct");

// ─── Status badge ───

const STATUS_CONFIG: Record<
  PublishStatus,
  { label: string; color: string; bg: string }
> = {
  published: { label: "Published", color: "#2a8a4a", bg: "rgba(42,138,74,0.08)" },
  copied: { label: "Copied", color: "#3066d4", bg: "rgba(48,102,212,0.08)" },
  "auto-drafted": { label: "Auto-drafted", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  failed: { label: "Failed", color: "#e04a32", bg: "rgba(224,74,50,0.08)" },
};

// ─── OAuth Setup Modal ───

function OAuthSetupModal({
  platform,
  onClose,
}: {
  platform: PlatformConfig;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(40px) saturate(1.5)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.5) inset",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#1a1a1a]">
            Set up {platform.label} credentials
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "rgba(0,0,0,0.05)", color: "#6b6b6b" }}
          >
            x
          </button>
        </div>
        <p className="text-sm text-[#6b6b6b] mb-4">
          Add these environment variables to your{" "}
          <code className="px-1.5 py-0.5 rounded text-xs bg-black/5 font-mono">.env.local</code>{" "}
          file:
        </p>
        <div className="rounded-xl p-4 mb-4 font-mono text-xs leading-relaxed" style={{ background: "rgba(0,0,0,0.04)" }}>
          {platform.envVars?.map((v) => (
            <div key={v} className="text-[#1a1a1a]">
              <span className="text-[#9a9a9a]"># </span>{v}=your_value_here
            </div>
          ))}
        </div>
        <p className="text-xs text-[#9a9a9a] mb-4">
          After adding credentials, restart your dev server for changes to take effect.
        </p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: "rgba(0,0,0,0.05)", color: "#6b6b6b" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rednote Tooltip ───

function RednoteTooltip() {
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl text-xs whitespace-nowrap z-10 pointer-events-none"
      style={{
        background: "rgba(30,30,30,0.92)",
        color: "#fff",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}
    >
      Rednote has no public API — copy text and paste manually into the app
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ background: "rgba(30,30,30,0.92)" }} />
    </div>
  );
}

// ─── Glass card style ───

const glassCard = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255,255,255,0.45)",
  boxShadow: "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
} as const;

// ─── Main PublishTab ───

export default function PublishTab({ content }: { content: string }) {
  const [campaign, setCampaign] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("pingi_campaign") || "";
    }
    return "";
  });
  const [log, setLog] = useState<PublishEntry[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [oauthModal, setOauthModal] = useState<PlatformConfig | null>(null);
  const [hoveredRednote, setHoveredRednote] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const hasContent = content.trim().length > 0;
  const hasOpenClawKey = process.env.NEXT_PUBLIC_OPENCLAW_CONFIGURED === "true";

  // Persist campaign in session
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pingi_campaign", campaign);
    }
  }, [campaign]);

  const addLogEntry = (entry: PublishEntry) => {
    setLog((prev) => [entry, ...prev]);
  };

  // Direct publish for LinkedIn/X
  const handleDirectPublish = async (platform: PlatformConfig) => {
    setPublishing(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platform: platform.key, campaign }),
      });
      const data = await res.json();
      if (res.status === 503 && data.missingVars) {
        setOauthModal(platform);
        return;
      }
      if (!res.ok) {
        addLogEntry({ id: crypto.randomUUID(), platform: platform.key, status: "failed", content, campaign: campaign || undefined, publishedAt: new Date(), error: data.error });
        return;
      }
      addLogEntry(data as PublishEntry);
    } catch {
      addLogEntry({ id: crypto.randomUUID(), platform: platform.key, status: "failed", content, campaign: campaign || undefined, publishedAt: new Date(), error: "Network error" });
    } finally {
      setPublishing(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async (platform: PlatformConfig) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(platform.key);
      setTimeout(() => setCopied(null), 2000);
      addLogEntry({ id: crypto.randomUUID(), platform: platform.key, status: "copied", content, campaign: campaign || undefined, publishedAt: new Date() });
    } catch {
      // fallback
    }
  };

  // OpenClaw auto-draft
  const handleOpenClaw = async (platform: PlatformConfig) => {
    setPublishing(true);
    try {
      const res = await fetch("/api/publish/openclaw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platform: platform.key, campaign }),
      });
      const data = await res.json();
      if (!res.ok) {
        addLogEntry({ id: crypto.randomUUID(), platform: platform.key, status: "failed", content, campaign: campaign || undefined, publishedAt: new Date(), error: data.error });
        return;
      }
      addLogEntry(data as PublishEntry);
    } catch {
      addLogEntry({ id: crypto.randomUUID(), platform: platform.key, status: "failed", content, campaign: campaign || undefined, publishedAt: new Date(), error: "Network error" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Content preview ─── */}
      <div
        className="rounded-2xl p-4"
        style={glassCard}
      >
        <label className="block text-xs font-medium text-[#6b6b6b] mb-2">
          Content preview
        </label>
        {hasContent ? (
          <p className="text-sm text-[#1a1a1a] leading-relaxed whitespace-pre-wrap">
            {content.length > 280 ? content.slice(0, 280) + "..." : content}
          </p>
        ) : (
          <p className="text-sm text-[#9a9a9a] italic">
            Not generated — switch to the Generate tab to write content first
          </p>
        )}
      </div>

      {/* ─── Campaign input ─── */}
      <div>
        <label className="block text-xs font-medium text-[#6b6b6b] mb-1.5">
          Campaign tag
        </label>
        <input
          type="text"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder="e.g. product-launch-q1, newsletter-12"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={{
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(0,0,0,0.08)",
            color: "#1a1a1a",
          }}
        />
      </div>

      {/* ─── Direct publish platforms (LinkedIn, X) ─── */}
      {DIRECT_PLATFORMS.map((p) => (
        <div key={p.key} className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: `${p.color}0a`, color: p.color, border: `1px solid ${p.color}15` }}
            >
              {p.letter}
            </span>
            <span className="text-sm font-semibold text-[#1a1a1a]">{p.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: "rgba(42,138,74,0.08)", color: "#2a8a4a" }}>
              Direct publish
            </span>
          </div>
          <button
            onClick={() => handleDirectPublish(p)}
            disabled={!hasContent || publishing}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: hasContent && !publishing ? "linear-gradient(135deg, #1a1a1a, #333)" : "rgba(0,0,0,0.06)",
              color: hasContent && !publishing ? "#fff" : "#9a9a9a",
              boxShadow: hasContent && !publishing ? "0 4px 16px rgba(0,0,0,0.1)" : "none",
              cursor: hasContent && !publishing ? "pointer" : "not-allowed",
            }}
          >
            {publishing ? "Publishing..." : `Publish to ${p.label}`}
          </button>
        </div>
      ))}

      {/* ─── Copy-only platforms (Rednote, Substack, Instagram) ─── */}
      {COPY_PLATFORMS.map((p) => {
        const isRednote = p.key === "rednote";
        const openclawDisabled = !hasOpenClawKey || !hasContent || publishing;

        return (
          <div key={p.key} className="rounded-2xl p-4 relative" style={glassCard}>
            {isRednote && hoveredRednote && <RednoteTooltip />}
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: `${p.color}0a`, color: p.color, border: `1px solid ${p.color}15` }}
                onMouseEnter={() => isRednote && setHoveredRednote(true)}
                onMouseLeave={() => isRednote && setHoveredRednote(false)}
              >
                {p.letter}
              </span>
              <span className="text-sm font-semibold text-[#1a1a1a]">{p.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: "rgba(48,102,212,0.08)", color: "#3066d4" }}>
                {isRednote ? "Copy & draft" : "Copy & draft"}
              </span>
            </div>

            {/* Two buttons side by side — always rendered */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCopy(p)}
                disabled={!hasContent}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  color: hasContent ? "#1a1a1a" : "#9a9a9a",
                  cursor: hasContent ? "pointer" : "not-allowed",
                }}
              >
                {copied === p.key ? "Copied!" : "\u{1F4CB} Copy & paste"}
              </button>

              <button
                onClick={() => handleOpenClaw(p)}
                disabled={openclawDisabled}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: hasOpenClawKey ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.04)",
                  border: "1px solid rgba(124,58,237,0.18)",
                  color: hasOpenClawKey && hasContent ? "#7c3aed" : "#a78bfa",
                  cursor: openclawDisabled ? "not-allowed" : "pointer",
                  opacity: hasOpenClawKey ? 1 : 0.5,
                }}
                title={hasOpenClawKey ? "Auto-draft with OpenClaw browser automation" : "Add OPENCLAW_API_KEY to .env.local to enable"}
              >
                {"\u{1F916}"} Auto-draft with OpenClaw
              </button>
            </div>
          </div>
        );
      })}

      {/* ─── Publora note ─── */}
      <p className="text-xs text-center" style={{ color: "#9a9a9a" }}>
        Want easier multi-platform publishing? Connect via Publora in Settings
      </p>

      {/* ─── Publish log ─── */}
      {log.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[#6b6b6b] mb-2">Publish log</h4>
          <div className="flex flex-col gap-1.5">
            {log.map((entry) => {
              const status = STATUS_CONFIG[entry.status];
              const platform = PLATFORMS.find((p) => p.key === entry.platform);
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.5)" }}
                >
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${platform?.color || "#666"}0a`, color: platform?.color || "#666" }}
                  >
                    {platform?.letter}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md font-medium${entry.status === "auto-drafted" ? " s-auto-drafted" : ""}`}
                    style={{ background: status.bg, color: status.color }}
                  >
                    {entry.status === "auto-drafted" && (
                      <span className="mr-1" aria-label="robot">{"\u{1F916}"}</span>
                    )}
                    {status.label}
                  </span>

                  {entry.campaign && (
                    <span className="px-2 py-0.5 rounded-md" style={{ background: "rgba(48,102,212,0.08)", color: "#3066d4" }}>
                      {entry.campaign}
                    </span>
                  )}

                  <span className="flex-1" />

                  <span className="text-[#9a9a9a]">
                    {new Date(entry.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  {entry.error && (
                    <span className="text-[#e04a32] truncate max-w-[200px]">{entry.error}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {oauthModal && <OAuthSetupModal platform={oauthModal} onClose={() => setOauthModal(null)} />}
    </div>
  );
}
