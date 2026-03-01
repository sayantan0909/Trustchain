import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";
import ClientOnly from "@/components/ClientOnly";
import WalletErrorBoundary from "@/components/WalletErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrustChain | Milestone-Based Escrow on Algorand",
  description: "Secure, decentralized escrow for freelancers and clients using Algorand smart contracts.",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <ClientOnly>
          <WalletProvider>
            <WalletErrorBoundary>
              {children}
            </WalletErrorBoundary>
          </WalletProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
