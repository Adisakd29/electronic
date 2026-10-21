import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { categoryInfo, weekMeta } from "@/content/course";
import type { LabId } from "@/content/types";
import { labCatalog, labIds } from "@/labs";
import { labIcon } from "@/components/shell/labIcons";
import { FreeLab } from "@/components/lab/FreeLab";

type Params = Promise<{ id: string }>;

const isLabId = (id: string): id is LabId => (labIds as string[]).includes(id);

export function generateStaticParams() {
  return labIds.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  if (!isLabId(id)) return { title: "ไม่พบห้องทดลอง" };
  const l = labCatalog[id];
  return { title: `${l.title} (ทดลองอิสระ)`, description: l.summary };
}

export default async function FreeLabPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!isLabId(id)) notFound();
  const l = labCatalog[id];
  const Icon = labIcon[id];
  return (
    <div className="mx-auto max-w-[1240px]">
      <Link href="/labs" className="inline-flex items-center gap-1 text-[0.95rem] font-semibold text-cobalt-ink hover:underline">
        <ChevronLeft className="size-4" aria-hidden />
        ห้องทดลองทั้งหมด
      </Link>

      <header className="mb-5 mt-3 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-md border border-copper/40 bg-copper-soft text-copper" aria-hidden>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.6rem] font-bold leading-tight text-ink md:text-[1.9rem]">{l.title}</h1>
          <p className="text-ink-3" lang="en">
            {l.titleEn} · ทดลองอิสระ ไม่บันทึกผล
          </p>
          <p className="mt-2 max-w-[68ch] text-ink-2">{l.summary}</p>
        </div>
      </header>

      <p className="mb-5 flex max-w-[80ch] items-start gap-2.5 rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-ink-2">
        <ShieldAlert className="mt-1 size-5 shrink-0 text-warn" aria-hidden />
        <span>
          <strong className="font-semibold text-ink">ความปลอดภัย:</strong> แบบจำลองนี้เป็นวงจรแรงดันต่ำ งานที่ต่อกับไฟบ้าน 230 V
          ทำได้เฉพาะเมื่อครูสาธิตในโรงฝึกงานเท่านั้น ห้ามนำค่าจากห้องทดลองไปทดลองกับไฟฟ้าจริงด้วยตนเอง
        </span>
      </p>

      <FreeLab id={id} />

      <section aria-labelledby="lab-weeks-h" className="mt-10">
        <h2 id="lab-weeks-h" className="text-[1.2rem] font-semibold text-ink">
          สัปดาห์ที่ใช้ห้องทดลองนี้
        </h2>
        <p className="mt-1 text-ink-2">ทำภารกิจของห้องทดลองในบทเรียนเพื่อบันทึกความก้าวหน้าและรับ XP</p>
        <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-panel">
          {l.weeks.map((w) => {
            const m = weekMeta[w - 1];
            return (
              <li key={w}>
                <Link href={`/learn/${w}/lab`} className="flex items-center gap-3 px-4 py-3 hover:bg-panel-2">
                  <span
                    aria-hidden
                    className="readout grid size-9 shrink-0 place-items-center rounded-full border-[3px] text-[0.9rem] font-semibold text-ink"
                    style={{ borderColor: m ? `var(${categoryInfo[m.category].cssVar})` : undefined }}
                  >
                    {w}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">สัปดาห์ที่ {w}</span>
                    <span className="block text-[0.95rem] text-ink-2">{m?.title}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
