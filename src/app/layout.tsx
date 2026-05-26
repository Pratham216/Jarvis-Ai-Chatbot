import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jarvis AI — multi-provider chat with built-in observability",
  description:
    "Jarvis AI: an LLM gateway with streaming, real-time inference logging, PII redaction and an observability dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6366f1",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <body className="min-h-screen">
          {children}
          <Toaster
            position="top-center"
            theme="system"
            offset={20}
            gap={8}
            toastOptions={{
              classNames: {
                toast:
                  "!bg-surface !border !border-border !text-foreground !shadow-xl !rounded-2xl !px-4 !py-3 !min-h-0 !w-auto !backdrop-blur",
                title: "!text-foreground !font-medium !text-sm",
                icon: "!text-accent",
                success: "!text-foreground",
                error: "!text-foreground",
                actionButton:
                  "!bg-red-500 !text-white !rounded-md !px-3 !py-1.5 !text-xs !font-medium hover:!bg-red-600 !transition-colors",
                cancelButton:
                  "!bg-surface-2 !text-foreground !rounded-md !px-3 !py-1.5 !text-xs !font-medium hover:!bg-border !transition-colors",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
