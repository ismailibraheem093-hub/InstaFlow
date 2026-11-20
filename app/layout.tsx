import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaFlow — Publishing, in rhythm",
  description: "A secure workspace for planning and managing Instagram publishing.",
  applicationName: "InstaFlow",
  manifest: "/manifest.webmanifest",
  themeColor: "#090b10"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
