import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatchFlow | Update Manager",
  description: "Enterprise patch management and deployment system",
};

const themeInitScript = `(() => {
  try {
    const saved = localStorage.getItem("patchflow-theme");
    const theme = saved === "dark" || saved === "light"
      ? saved
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
