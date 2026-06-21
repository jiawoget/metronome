import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Metronome Practice",
  description: "Local-first guitar practice app shell"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
