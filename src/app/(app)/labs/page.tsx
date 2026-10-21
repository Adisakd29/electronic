import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { categoryInfo, weekMeta } from "@/content/course";
import type { LabId } from "@/content/types";
import { labCatalog } from "@/labs";
import { PageHeader } from "@/components/ui";
import { labIcon } from "@/components/shell/labIcons";

export const metadata: Metadata = {
  title: "ห้องทดลองเสมือน",
  description: "ห้องทดลองเสมือน 10 ชุดของรายวิชา ทดลองวงจรแรงดันต่ำได้อิสระ เลือกชุดค่าเริ่มต้น และอ่านข้อสมมติของแบบจำลอง",
};

const labs = Object.entries(labCatalog) as [LabId, (typeof labCatalog)[LabId]][];

export default function LabsPage() {
  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader
        kicker="ทดลองได้อิสระ ไม่บันทึกคะแนน"
        title="ห้องทดลองเสมือน"
        description="เปิดห้องทดลองใดก็ได้ เปลี่ยนค่าแล้วสังเกตผลทันที ภารกิจที่นับความก้าวหน้าอยู่ในขั้น “ห้องทดลองเสมือน” ของแต่ละสัปดาห์"
      />

      <p className="mb-6 flex max-w-[72ch] items-start gap-2.5 rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-ink-2">
        <ShieldAlert className="mt-1 size-5 shrink-0 text-warn" aria-hidden />
        <span>
          ทุกห้องจำลองวงจรแรงดันต่ำเท่านั้น งานที่ต่อกับไฟบ้าน 230 V ให้ครูสาธิตในโรงฝึกงาน ห้ามทดลองเองตามแบบจำลอง
        </span>
      </p>

      <ol className="divide-y divide-line rounded-md border border-line bg-panel">
        {labs.map(([id, l], i) => {
          const Icon = labIcon[id];
          return (
            <li key={id} className="grid gap-x-5 gap-y-3 px-4 py-5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:px-5 lg:grid-cols-[3rem_minmax(0,1fr)_minmax(0,17rem)]">
              <span className="relative hidden sm:block" aria-hidden>
                <span className="grid size-12 place-items-center rounded-md border border-copper/40 bg-copper-soft text-copper">
                  <Icon className="size-6" />
                </span>
                <span className="readout absolute -bottom-5 left-0 w-12 text-center text-[0.8rem] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <div className="min-w-0">
                <h2 className="flex items-center gap-2.5 text-[1.15rem] font-semibold leading-snug">
                  <Icon className="size-5 shrink-0 text-copper sm:hidden" aria-hidden />
                  <Link href={`/labs/${id}`} className="text-ink underline-offset-4 hover:text-cobalt-ink hover:underline">
                    {l.title}
                  </Link>
                </h2>
                <p className="text-[0.92rem] text-ink-3" lang="en">
                  {l.titleEn}
                </p>
                <p className="mt-1.5 max-w-[62ch] text-ink-2">{l.summary}</p>
                <Link href={`/labs/${id}`} className="mt-2 inline-block font-semibold text-cobalt-ink underline underline-offset-4">
                  เปิดห้องทดลอง<span className="sr-only"> {l.title}</span>
                </Link>
              </div>
              <div className="min-w-0 sm:col-start-2 lg:col-start-auto">
                <p className="text-[0.9rem] text-ink-3">ใช้ในสัปดาห์</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {l.weeks.map((w) => {
                    const m = weekMeta[w - 1];
                    return (
                      <li key={w}>
                        <Link
                          href={`/learn/${w}/lab`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line-strong bg-panel px-2.5 text-[0.9rem] font-semibold text-ink-2 hover:bg-panel-2 hover:text-ink"
                          title={m?.title}
                        >
                          <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: m ? `var(${categoryInfo[m.category].cssVar})` : undefined }} />
                          สัปดาห์ที่ {w}
                          <span className="sr-only">: {m?.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
