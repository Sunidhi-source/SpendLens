import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpendLens — Free AI Spend Audit",
  description:
    "Find out if you're overpaying for AI tools. Free instant audit of your AI stack with real savings estimates. No login required.",
  openGraph: {
    title: "SpendLens — Free AI Spend Audit",
    description:
      "Find out if you're overpaying for AI tools. Free instant audit.",
    type: "website",
    siteName: "SpendLens",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpendLens — Free AI Spend Audit",
    description:
      "Find out if you're overpaying for AI tools. Free instant audit.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
