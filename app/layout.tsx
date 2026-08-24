import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TimerProvider } from "@/lib/timer-context";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: 'Pinguine OS',
  description: 'IT ROOF Operating System',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pinguine OS',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className={`${geistSans.className} min-h-full flex flex-col bg-background`}>
        <ThemeProvider>
          <TimerProvider>
            <AppShell>
              {children}
            </AppShell>
          </TimerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
