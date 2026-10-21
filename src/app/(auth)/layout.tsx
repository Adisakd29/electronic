import Link from "next/link";
import type { ReactNode } from "react";
import { course } from "@/content/course";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="font-semibold text-ink hover:text-cobalt">
            {course.name}
          </Link>
          <span className="readout text-[0.9rem] text-ink-3">{course.code}</span>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center px-4 py-10 md:py-16">
        {children}
      </main>
    </div>
  );
}
