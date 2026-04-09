import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SmartTour – AI-Based Tourist Crowd Monitoring",
  description: "Real-time crowd monitoring and forecasting for tourist destinations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-[#0f0f12] text-zinc-100`}>
        {children}
      </body>
    </html>
  );
}
