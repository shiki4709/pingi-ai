"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const T = {
  bg: "#0A0F1C",
  bgEnd: "#1A0B2E",
  heading: "#F1F5F9",
  body: "#B0BEC5",
  muted: "#8899A6",
  glass: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  purple: "#7C3AED",
  blue: "#4F46E5",
};

const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

export default function AuthClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/onboarding");
      }
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: `linear-gradient(180deg, ${T.bg} 0%, ${T.bgEnd} 50%, ${T.bg} 100%)`,
        fontFamily: sans,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 800,
          marginBottom: 16,
          fontFamily: serif,
          color: "#fff",
          background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
          boxShadow: `0 6px 24px ${T.purple}30`,
        }}
      >
        P
      </div>

      <h2
        style={{
          fontFamily: serif,
          fontSize: 26,
          fontWeight: 400,
          color: T.heading,
          margin: "0 0 4px",
        }}
      >
        Create your account
      </h2>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>
        Takes about 2 minutes
      </p>

      {/* Glass card wrapping Supabase Auth UI */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: T.glass,
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          border: `1px solid ${T.border}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "28px 24px",
        }}
      >
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: T.purple,
                  brandAccent: "#6D28D9",
                  inputBackground: "rgba(255,255,255,0.06)",
                  inputBorder: T.border,
                  inputText: T.heading,
                  inputPlaceholder: T.muted,
                  messageText: T.body,
                  anchorTextColor: T.muted,
                  defaultButtonBackground: T.glass,
                  defaultButtonBackgroundHover: "rgba(255,255,255,0.1)",
                  defaultButtonBorder: T.border,
                  defaultButtonText: T.body,
                  inputLabelText: T.body,
                },
                fonts: {
                  bodyFontFamily: sans,
                  inputFontFamily: sans,
                  buttonFontFamily: sans,
                  labelFontFamily: sans,
                },
                radii: {
                  borderRadiusButton: "10px",
                  buttonBorderRadius: "10px",
                  inputBorderRadius: "10px",
                },
              },
            },
          }}
          providers={["google"]}
          redirectTo={`${window.location.origin}/auth/callback?next=/onboarding`}
        />
      </div>
    </div>
  );
}
