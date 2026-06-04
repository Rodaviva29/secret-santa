import type { Metadata } from "next";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import "react-day-picker/style.css";
import { getOgSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const og = await getOgSettings();
  const images = og.banner ? [{ url: og.banner }] : undefined;
  return {
    title: og.title,
    description: og.description,
    icons: {
      icon: og.icon ?? "/android.png",
      apple: "/ios.png",
    },
    openGraph: {
      title: og.title,
      description: og.description,
      images,
    },
    twitter: {
      card: og.banner ? "summary_large_image" : "summary",
      title: og.title,
      description: og.description,
      images: og.banner ? [og.banner] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
