import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineIndicator } from "@/components/offline-indicator";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cashflow CV OCM",
  description: "Sistem manajemen cashflow dan pembelian/penjualan buah sawit CV OCM",
  appleWebApp: {
    capable: true,
    title: "CV OCM",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Status bar menyatu dengan background iOS (light & dark)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased bg-background" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)" }} />
          <OfflineIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
