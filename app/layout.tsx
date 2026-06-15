import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navbar";
import { TimerProvider } from "@/lib/timer-context";
import { TimerBanner } from "@/components/timer-banner";

const garet = localFont({
  src: [
    {
      path: "./fonts/Garet-Book.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Garet-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-garet",
});

const gotham = localFont({
  src: [
    {
      path: "./fonts/Gotham-Book.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Gotham-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gotham",
});

export const metadata: Metadata = {
  title: 'Cherry OS',
  description: 'IT ROOF Operating System',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cherry OS',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${garet.variable} ${gotham.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f7f6f2]">
        <TimerProvider>
          <TimerBanner />
          {children}
          <Navbar />
        </TimerProvider>
      </body>
    </html>
  );
}
