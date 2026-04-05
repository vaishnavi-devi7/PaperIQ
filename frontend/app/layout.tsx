import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PaperIQ",
  description: "AI-powered research paper analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body>{children}</body>
    </html>
  );
}