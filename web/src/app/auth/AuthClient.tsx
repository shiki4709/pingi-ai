"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const T = {
  ink: "#1a1a1a",
  sub: "#6b6b6b",
  muted: "#9a9a9a",
  glass: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.45)",
};

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
        background: `radial-gradient(ellipse at 20% 0%, rgba(232,228,221,0.8) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(226,220,210,0.6) 0%, transparent 50%),
                     radial-gradient(ellipse at 50% 50%, rgba(242,240,236,1) 0%, rgba(234,230,223,1) 100%)`,
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
          fontFamily: "'Instrument Serif', Georgia, serif",
          color: "#fff",
          background: "linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
        }}
      >
        P
      </div>

      <h2
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 26,
          fontWeight: 400,
          color: T.ink,
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
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: `1px solid ${T.border}`,
          boxShadow:
            "0 2px 16px rgba(0,0,0,0.04), 0 0.5px 0 rgba(255,255,255,0.6) inset",
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
                  brand: "#1a1a1a",
                  brandAccent: "#333",
                  inputBackground: "rgba(255,255,255,0.6)",
                  inputBorder: "rgba(0,0,0,0.08)",
                  inputText: "#1a1a1a",
                  inputPlaceholder: "#9a9a9a",
                },
                fonts: {
                  bodyFontFamily: "'DM Sans', sans-serif",
                  inputFontFamily: "'DM Sans', sans-serif",
                  buttonFontFamily: "'DM Sans', sans-serif",
                  labelFontFamily: "'DM Sans', sans-serif",
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
          redirectTo={`${window.location.origin}/onboarding`}
        />
      </div>
    </div>
  );
}
