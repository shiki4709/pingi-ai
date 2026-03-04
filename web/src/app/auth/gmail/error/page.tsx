export default function GmailError({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reasons: Record<string, string> = {
    access_denied: "You declined the permission request.",
    token_exchange_failed: "Failed to exchange the authorization code. Try again.",
    db_error: "Failed to save your connection. Try again.",
  };

  const message = reasons[searchParams.reason ?? ""] ?? "Something went wrong. Try connecting again.";

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f2f0ec" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#e04a32", marginBottom: 8 }}>Connection failed</h1>
        <p style={{ fontSize: 14, color: "#6b6b6b", lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  );
}
