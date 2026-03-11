import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pingi AI",
  description: "Show up early in the right conversations on X. AI-drafted replies, human-in-the-loop control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
