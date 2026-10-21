import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { course } from "@/content/course";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { StaffNav } from "@/components/staff/StaffNav";
import { getSessionUser } from "@/server/auth";
import { roleLabel } from "@/components/staff/format";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-panel focus:px-3 focus:py-2">
        ข้ามไปเนื้อหาหลัก
      </a>
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-3">
            <Link href="/teacher" className="truncate font-semibold text-ink hover:text-cobalt">
              {course.name}
            </Link>
            <span className="readout hidden text-[0.9rem] text-ink-3 sm:inline">{course.code}</span>
          </div>
          <Suspense fallback={<div className="h-9 w-40" />}>
            <UserBox />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 gap-6 px-4 py-6 md:grid md:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="mb-5 md:mb-0">
          <Suspense fallback={<div className="h-80 animate-pulse rounded-md bg-panel-2" />}>
            <Nav />
          </Suspense>
        </aside>
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Staff chrome is rendered for staff only; pages redirect everyone else to /forbidden or /login. */
const isStaff = (role?: string) => role === "teacher" || role === "admin";

async function Nav() {
  const me = await getSessionUser();
  if (!isStaff(me?.role)) return null;
  return <StaffNav isAdmin={me?.role === "admin"} />;
}

async function UserBox() {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.95rem]">
      <span className="text-ink-2">
        {me.name} <span className="text-ink-3">({roleLabel[me.role]})</span>
      </span>
      <Link href="/learn" className="rounded-sm px-2 py-1 text-cobalt hover:bg-cobalt-soft">
        ดูมุมมองนักเรียน
      </Link>
      <Link href="/change-password" className="rounded-sm px-2 py-1 text-ink-2 hover:bg-panel-2">
        เปลี่ยนรหัสผ่าน
      </Link>
      <SignOutButton />
    </div>
  );
}
