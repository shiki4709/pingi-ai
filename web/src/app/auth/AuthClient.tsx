"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import PingiLogo from "@/components/PingiLogo";

/* ─── design tokens ─── */
const T = {
  bg: "#FAFAF7",
  surface: "#F3F2EE",
  ink: "#1E1B4B",
  body: "#4A4A46",
  muted: "#8C8C86",
  accent: "#6366F1",
  accentHover: "#4F46E5",
  border: "#E5E4DF",
  borderLight: "#EDECE8",
  error: "#DC2626",
};
const serif = "'Instrument Serif', Georgia, serif";
const sans = "'DM Sans', sans-serif";

/* ─── reusable styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: sans,
  color: T.ink,
  background: "#fff",
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  height: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 500,
  fontFamily: sans,
  color: "#fff",
  background: T.accent,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};

export default function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowser();

  /* default to sign-up; ?view=signin for returning users */
  const [mode, setMode] = useState<"signup" | "signin">(
    searchParams.get("view") === "signin" ? "signin" : "signup"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [emailSent, setEmailSent] = useState(false);

  /* redirect once signed in (Google OAuth or email confirm) */
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

  /* ─── validation ─── */
  const validate = useCallback((): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (mode === "signup" && password.length < 6)
      errs.password = "Password must be at least 6 characters";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, password, mode]);

  /* ─── email + password submit ─── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signUpErr) {
          setError(signUpErr.message);
        } else {
          setEmailSent(true);
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          setError(signInErr.message);
        }
        /* onAuthStateChange handles redirect */
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Google OAuth ─── */
  const handleGoogle = async () => {
    setError("");
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (oauthErr) setError(oauthErr.message);
  };

  /* ─── shell ─── */
  const heading = mode === "signup" ? "Create your account" : "Welcome back";
  const subtitle =
    mode === "signup" ? "Takes about 2 minutes" : "Sign in to your Pingi account";

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
      <div style={{ marginBottom: 16 }}>
        <PingiLogo size={40} />
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
        {heading}
      </h2>
      <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>
        {subtitle}
      </p>

      {/* Card */}
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
        {/* ── "Check your inbox" screen ── */}
        {emailSent ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#9993;</div>
            <h3
              style={{
                fontFamily: serif,
                fontSize: 20,
                fontWeight: 400,
                color: T.ink,
                margin: "0 0 8px",
              }}
            >
              Check your inbox
            </h3>
            <p style={{ fontSize: 14, color: T.body, margin: "0 0 20px", lineHeight: 1.5 }}>
              We sent a confirmation link to{" "}
              <strong style={{ color: T.ink }}>{email}</strong>.
              <br />
              Click the link to finish signing up.
            </p>
            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setPassword("");
              }}
              style={{
                ...btnPrimary,
                background: T.surface,
                color: T.body,
                border: `1px solid ${T.border}`,
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogle}
              style={{
                ...btnPrimary,
                background: "#fff",
                color: T.ink,
                border: `1px solid ${T.border}`,
                marginBottom: 20,
                gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.04 24.04 0 0 0 0 21.56l7.98-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </button>

            {/* divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1, height: 1, background: T.borderLight }} />
              <span style={{ fontSize: 12, color: T.muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: T.borderLight }} />
            </div>

            {/* Email + password form */}
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="auth-email"
                  style={{ display: "block", fontSize: 13, color: T.body, marginBottom: 4 }}
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  style={{
                    ...inputStyle,
                    borderColor: fieldErrors.email ? T.error : T.border,
                  }}
                />
                {fieldErrors.email && (
                  <p style={{ fontSize: 12, color: T.error, margin: "4px 0 0" }}>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="auth-password"
                  style={{ display: "block", fontSize: 13, color: T.body, marginBottom: 4 }}
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  style={{
                    ...inputStyle,
                    borderColor: fieldErrors.password ? T.error : T.border,
                  }}
                />
                {fieldErrors.password && (
                  <p style={{ fontSize: 12, color: T.error, margin: "4px 0 0" }}>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* General error (from Supabase) */}
              {error && (
                <p
                  style={{
                    fontSize: 13,
                    color: T.error,
                    background: "#FEF2F2",
                    border: `1px solid #FECACA`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    margin: "0 0 14px",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...btnPrimary,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Signing in..."
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>

            {/* Toggle sign-in / sign-up */}
            <p
              style={{
                fontSize: 13,
                color: T.muted,
                textAlign: "center",
                marginTop: 16,
                marginBottom: 0,
              }}
            >
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError("");
                      setFieldErrors({});
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.accent,
                      cursor: "pointer",
                      fontFamily: sans,
                      fontSize: 13,
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      setFieldErrors({});
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: T.accent,
                      cursor: "pointer",
                      fontFamily: sans,
                      fontSize: 13,
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
