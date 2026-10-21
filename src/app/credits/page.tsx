import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { photos, LICENSE_URL } from "@/content/photos";

export const metadata: Metadata = {
  title: "ที่มาของภาพถ่าย",
  description: "รายการภาพถ่ายของจริงที่ใช้ในบทเรียน พร้อมผู้ถ่าย สัญญาอนุญาต และลิงก์ต้นฉบับ",
};

export default function CreditsPage() {
  const rows = Object.entries(photos)
    .filter((e): e is [string, NonNullable<(typeof e)[1]>] => !!e[1])
    .sort(([a], [b]) => a.localeCompare(b));
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[900px] px-4 py-10 outline-none sm:px-6">
      <Camera className="size-10 text-copper" aria-hidden />
      <h1 className="mt-3 text-[1.7rem] font-bold leading-tight text-ink md:text-[1.9rem]">ที่มาของภาพถ่าย</h1>
      <p className="mt-2 max-w-[65ch] text-ink-2">
        ภาพถ่ายอุปกรณ์ของจริงในบทเรียนมาจาก Wikimedia Commons ภายใต้สัญญาอนุญาตแบบเปิด (Creative Commons หรือสาธารณสมบัติ)
        ส่วนภาพลายเส้นและแผนภาพทั้งหมดจัดทำขึ้นใหม่สำหรับรายวิชานี้
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-md border border-line bg-panel p-5 text-ink-2">ยังไม่มีภาพถ่ายในบทเรียน</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-md border border-line bg-panel">
          {rows.map(([key, p]) => {
            const lic = LICENSE_URL[p.license];
            return (
              <li key={key} className="flex flex-wrap gap-4 p-4" id={`photo-${key}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of self-hosted file */}
                <img src={p.src} alt="" width={p.width} height={p.height} loading="lazy" className="h-20 w-28 shrink-0 rounded-sm object-cover" />
                <div className="min-w-0 flex-1 basis-64 text-[0.95rem]">
                  <p className="font-semibold text-ink">
                    สัปดาห์ที่ {Number(key.slice(1, 3))} · {p.caption ?? p.alt}
                  </p>
                  <p className="mt-0.5 break-words text-ink-2">
                    “{p.title}” โดย {p.author} ·{" "}
                    {lic ? (
                      <a href={lic} target="_blank" rel="noopener noreferrer license" className="underline">
                        {p.license}
                      </a>
                    ) : (
                      p.license
                    )}{" "}
                    ·{" "}
                    <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      ต้นฉบับ
                    </a>
                    {p.modified ? ` · ${p.modified}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6">
        <Link href="/" className="font-semibold text-cobalt-ink underline underline-offset-4">
          กลับหน้าแรก
        </Link>
      </p>
    </main>
  );
}
