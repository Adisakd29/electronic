import Link from "next/link";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto grid w-full max-w-[640px] flex-1 content-center px-4 py-16 outline-none">
      <svg viewBox="0 0 320 90" className="mb-6 w-full max-w-[320px]" aria-hidden="true">
        <path d="M10 45 H110" stroke="var(--copper)" strokeWidth="6" strokeLinecap="round" />
        <path d="M210 45 H310" stroke="var(--line-strong)" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 12" />
        <circle cx="130" cy="45" r="16" fill="var(--panel)" stroke="var(--copper)" strokeWidth="6" />
        <circle cx="190" cy="45" r="16" fill="var(--panel)" stroke="var(--line-strong)" strokeWidth="6" />
        <path d="M150 30 L170 60 M170 30 L150 60" stroke="var(--danger)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <h1 className="text-[1.7rem] font-bold text-ink">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-2 text-ink-2">ลิงก์นี้อาจพิมพ์ผิด หรือหน้านั้นถูกย้ายไปแล้ว ตรวจสอบที่อยู่อีกครั้ง หรือกลับไปเลือกบทเรียนจากหน้าแรก</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <LinkButton href="/">กลับหน้าแรก</LinkButton>
        <Link href="/learn" className="font-semibold text-cobalt-ink underline underline-offset-4">
          ไปที่บทเรียนของฉัน
        </Link>
      </div>
    </main>
  );
}
