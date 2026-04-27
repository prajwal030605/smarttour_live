import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import CommandPalette from "@/components/ui/CommandPalette";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SmartTour – AI Crowd Intelligence for Smarter Travel",
  description:
    "Real-time tourist crowd monitoring, AI-powered forecasting, and smart destination advisory for Uttarakhand's top locations. GPS geofencing — arrive and your vehicle is logged automatically.",
  keywords: [
    "smart tourism", "crowd monitoring", "Uttarakhand", "Mussoorie",
    "Rishikesh", "AI forecasting", "GPS geofencing", "Kedarnath", "Haridwar",
  ],
  manifest: "/manifest.json",
  openGraph: {
    title: "SmartTour – AI Crowd Intelligence",
    description: "Smart Crowd Intelligence for Smarter Travel",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SmartTour",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased min-h-screen bg-navy-900 text-foreground`}
      >
        <ServiceWorkerRegister />
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}
