import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatchFlow | Update Manager",
  description: "Enterprise patch management and deployment system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
