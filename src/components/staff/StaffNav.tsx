"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const TEACHER = [
  { href: "/teacher", label: "ภาพรวม" },
  { href: "/teacher/students", label: "นักเรียน" },
  { href: "/teacher/items", label: "คำถามที่ตอบผิดบ่อย" },
  { href: "/teacher/prepost", label: "ก่อน–หลังเรียน" },
  { href: "/teacher/labs", label: "ห้องทดลอง" },
  { href: "/teacher/submissions", label: "ใบงาน" },
  { href: "/teacher/competency", label: "ประเมินสมรรถนะ" },
  { href: "/teacher/unlock", label: "การปลดล็อก" },
  { href: "/teacher/questions", label: "คลังข้อสอบ" },
  { href: "/teacher/exports", label: "ส่งออกรายงาน" },
  { href: "/teacher/class", label: "บัญชีนักเรียน" },
];
const ADMIN = [
  { href: "/admin", label: "ระบบ" },
  { href: "/admin/users", label: "ผู้ใช้" },
  { href: "/admin/classrooms", label: "ห้องเรียน" },
  { href: "/admin/allowlist", label: "อีเมล Google" },
  { href: "/admin/backup", label: "สำรองข้อมูล" },
  { href: "/admin/audit", label: "บันทึกการใช้งาน" },
];

export function StaffNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const cls = sp.get("class");
  const link = (href: string) => (cls && href.startsWith("/teacher") ? `${href}?class=${encodeURIComponent(cls)}` : href);
  const active = (href: string) => (href === "/teacher" || href === "/admin" ? pathname === href : pathname.startsWith(href));
  const Item = ({ href, label }: { href: string; label: string }) => (
    <li>
      <Link
        href={link(href)}
        aria-current={active(href) ? "page" : undefined}
        className={cn(
          "block whitespace-nowrap rounded-sm px-3 py-2 text-[0.95rem] text-ink-2 hover:bg-panel-2 hover:text-ink",
          active(href) && "bg-cobalt-soft font-semibold text-cobalt-ink",
        )}
      >
        {label}
      </Link>
    </li>
  );
  return (
    <nav aria-label="เมนูครูและผู้ดูแล" className="space-y-4">
      <div>
        <p className="px-3 pb-1 text-[0.85rem] font-semibold text-ink-3">ครูผู้สอน</p>
        <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">{TEACHER.map((i) => <Item key={i.href} {...i} />)}</ul>
      </div>
      {isAdmin ? (
        <div>
          <p className="px-3 pb-1 text-[0.85rem] font-semibold text-ink-3">ผู้ดูแลระบบ</p>
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">{ADMIN.map((i) => <Item key={i.href} {...i} />)}</ul>
        </div>
      ) : null}
    </nav>
  );
}
