"use client";

import { useState } from "react";
import PublishTab from "@/components/tabs/PublishTab";

const TABS = [
  { key: "generate", label: "Generate" },
  { key: "publish", label: "Publish" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function DashboardShell() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [generatedContent, setGeneratedContent] = useState("");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 h-[54px]"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          borderBottom: "1px solid rgba(255,255,255,0.45)",
          boxShadow:
            "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              background: "linear-gradient(135deg, #1a1a1a, #333)",
            }}
          >
            P
          </div>
          <span
            className="text-lg text-[#1a1a1a]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Pingi
          </span>
        </div>

        {/* Tab switcher */}
        <div
          className="flex rounded-[10px] p-[3px]"
          style={{ background: "rgba(0,0,0,0.04)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background:
                  activeTab === t.key ? "rgba(255,255,255,0.85)" : "transparent",
                color: activeTab === t.key ? "#1a1a1a" : "#9a9a9a",
                boxShadow:
                  activeTab === t.key
                    ? "0 1px 4px rgba(0,0,0,0.06)"
                    : "none",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-[700px] w-full mx-auto px-4 py-5">
        {activeTab === "generate" && (
          <div className="flex flex-col gap-4">
            <label className="block text-xs font-medium text-[#6b6b6b]">
              Content to publish
            </label>
            <textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              placeholder="Write or paste your content here, then switch to the Publish tab..."
              rows={8}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-y leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(0,0,0,0.08)",
                color: "#1a1a1a",
              }}
            />
            {generatedContent.trim() && (
              <button
                onClick={() => setActiveTab("publish")}
                className="self-end px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #1a1a1a, #333)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                }}
              >
                Continue to Publish
              </button>
            )}
          </div>
        )}

        {activeTab === "publish" && (
          <PublishTab content={generatedContent} />
        )}
      </div>
    </div>
  );
}
