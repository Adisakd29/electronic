import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-sans-thai/700.css";
import "@fontsource-variable/noto-sans-thai/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TopBar } from "@/components/shell/TopBar";
import { course } from "@/content/course";

export const metadata: Metadata = {
  title: { default: `${course.name} (${course.code})`, template: `%s | ${course.code}` },
  description: `บทเรียนออนไลน์รายวิชา ${course.code} ${course.name} ${course.level} 18 สัปดาห์ พร้อมห้องทดลองเสมือน แบบฝึก และแบบทดสอบ`,
  applicationName: `${course.code} ${course.name}`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1822" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col antialiased">
        <ThemeProvider>
          <a href="#main" className="ee-skip">
            ข้ามไปยังเนื้อหาหลัก
          </a>
          <TopBar />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
              classNames: {
                toast: "bg-panel! text-ink! border-line! font-sans! text-[0.95rem]!",
                description: "text-ink-2!",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
