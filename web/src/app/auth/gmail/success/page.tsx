export default function GmailSuccess() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f2f0ec" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>G</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>Gmail connected</h1>
        <p style={{ fontSize: 14, color: "#6b6b6b", lineHeight: 1.6 }}>
          Pingi can now monitor your inbox for messages that need replies. You can close this window and return to Telegram.
        </p>
      </div>
    </div>
  );
}
