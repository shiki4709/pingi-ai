"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const T = {
  bg: "#FAFAF7",
  surface: "#F3F2EE",
  ink: "#1A1917",
  body: "#4A4A46",
  muted: "#8C8C86",
  accent: "#C2410C",
  accentHover: "#9A3412",
  border: "#E5E4DF",
  borderLight: "#EDECE8",
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
        background: T.bg,
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
          background: T.ink,
        }}
      >
        P
      </div>

      <h2
        style={{
          fontFamily: serif,
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

      {/* Card wrapping Supabase Auth UI */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          border: `1px solid ${T.border}`,
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
                  brand: T.accent,
                  brandAccent: T.accentHover,
                  inputBackground: "#fff",
                  inputBorder: T.border,
                  inputText: T.ink,
                  inputPlaceholder: T.muted,
                  messageText: T.body,
                  anchorTextColor: T.muted,
                  defaultButtonBackground: T.surface,
                  defaultButtonBackgroundHover: T.borderLight,
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
