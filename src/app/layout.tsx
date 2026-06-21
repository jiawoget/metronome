import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Metronome Practice",
  description: "v0 preflight scaffold for the local-first guitar practice app"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
