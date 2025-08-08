import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { PropsWithChildren } from "react";
import { Providers } from "@/lib/providers";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Porto",
  description:
    "Sign in with superpowers. Buy, swap, subscribe, and much more. No passwords or extensions required.",
    generator: 'v0.dev'
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={geist.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
