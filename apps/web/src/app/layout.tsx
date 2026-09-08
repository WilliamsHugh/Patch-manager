import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatchFlow | Update Manager",
  description: "Hệ thống quản lý và triển khai bản vá doanh nghiệp",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
