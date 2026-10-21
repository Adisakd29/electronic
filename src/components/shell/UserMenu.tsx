"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, GraduationCap, KeyRound, LayoutDashboard, LogIn, LogOut, ShieldCheck } from "lucide-react";
import type { SessionUser } from "@/server/contracts";
import { buttonClass } from "@/components/ui";

const roleText = { student: "นักเรียน", teacher: "ครู", admin: "ผู้ดูแลระบบ" } as const;

export function SignInButton() {
  return (
    <Link href="/login" className={buttonClass("primary", "sm")}>
      <LogIn className="size-4" aria-hidden />
      เข้าสู่ระบบ
    </Link>
  );
}

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // close when the page is hidden by <Activity>
  useLayoutEffect(() => () => setOpen(false), []);

  if (!user) return <SignInButton />;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    } catch {
      /* fall through: reload clears client state anyway */
    }
    // Full reload on purpose: drops every client cache (router, lesson state) of the signed-out user.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  const item = "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-ink hover:bg-panel-2";
  const initial = [...user.name.trim()][0] ?? "?";
  return (
    <div ref={ref} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-sm pl-1 pr-2 hover:bg-panel-2"
      >
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-copper-soft font-bold text-copper">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate font-medium text-ink md:inline">{user.name}</span>
        <span className="sr-only md:hidden">เมนูบัญชีของ {user.name}</span>
        <ChevronDown className="size-4 text-ink-3" aria-hidden />
      </button>
      {open ? (
        <div id={menuId} className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-line bg-panel p-1.5 shadow-2">
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate font-semibold text-ink">{user.name}</p>
            <p className="text-[0.88rem] text-ink-3">
              {roleText[user.role]}
              {user.username ? ` (${user.username})` : user.email ? ` (${user.email})` : ""}
            </p>
          </div>
          <nav aria-label="เมนูบัญชี" className="pt-1">
            <Link href="/dashboard" className={item} onClick={() => setOpen(false)}>
              <LayoutDashboard className="size-4 text-ink-3" aria-hidden />
              แดชบอร์ดของฉัน
            </Link>
            {user.role !== "student" ? (
              <Link href="/teacher" className={item} onClick={() => setOpen(false)}>
                <GraduationCap className="size-4 text-ink-3" aria-hidden />
                ส่วนของครู
              </Link>
            ) : null}
            {user.role === "admin" ? (
              <Link href="/admin" className={item} onClick={() => setOpen(false)}>
                <ShieldCheck className="size-4 text-ink-3" aria-hidden />
                ผู้ดูแลระบบ
              </Link>
            ) : null}
            <Link href="/change-password" className={item} onClick={() => setOpen(false)}>
              <KeyRound className="size-4 text-ink-3" aria-hidden />
              เปลี่ยนรหัสผ่าน
            </Link>
            <button type="button" className={item} onClick={signOut} disabled={signingOut}>
              <LogOut className="size-4 text-ink-3" aria-hidden />
              {signingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
