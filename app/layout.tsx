import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nyein — Patisserie & Birthday Cakes",
  description: "Celebrate sweet moments with Nyein.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1c0c14] text-white antialiased">
        {children}
      </body>
    </html>
  );
}