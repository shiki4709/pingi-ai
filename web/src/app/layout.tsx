import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pingi AI",
  description: "Agentic AI for social media engagement. Catch the right posts early, reply fast, and grow your visibility without living on X.",
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
