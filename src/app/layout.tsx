import type { Metadata } from "next";
import { Albert_Sans, Alumni_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const albert = Albert_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-albert" });
const alumni = Alumni_Sans({ subsets: ["latin"], weight: ["700"], variable: "--font-alumni" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains" });

const TITLE = "BayseBonds: near-certain Bayse predictions ending this year";
const SHARE_DESCRIPTION = "Near-certain Bayse predictions that pay out before Dec 31 — liquidity, returns, and trade links.";
const ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M7 3v24l6.5-6.5 4.2 9.5 3.8-1.7-4.2-9.3H26z" fill="#f5f5f5" stroke="#0a0a0a" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  );

export const metadata: Metadata = {
  title: TITLE,
  description:
    "Screen near-certain Bayse markets priced 95¢–99.5¢ that pay out before Dec 31. See total liquidity, returns, and trade links.",
  icons: { icon: ICON },
  openGraph: { title: TITLE, description: SHARE_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: SHARE_DESCRIPTION },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${albert.variable} ${alumni.variable} ${jetbrains.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
