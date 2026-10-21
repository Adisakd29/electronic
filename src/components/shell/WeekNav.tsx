"use client";
/** 18-week sidebar: category chip, progress ring, lock + reason, stage links for the open week. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, FlaskConical, LayoutDashboard, Lock } from "lucide-react";
import { categoryInfo, stages, weekMeta } from "@/content/course";
import type { SidebarData } from "@/server/contracts";
import { cn } from "@/lib/cn";
import { ProgressBar, ProgressRing } from "@/components/ui";
import { Tooltip } from "@/components/ui/client";
import { useDrawer } from "./AppShell";

export function WeekNav({ data, loading = false }: { data: SidebarData | null; loading?: boolean }) {
  const path = usePathname() ?? "";
  const { close } = useDrawer();
  const m = path.match(/^\/learn\/(\d+)(?:\/([a-z]+))?/);
  const openWeek = m ? Number(m[1]) : (data?.currentWeek ?? null);
  const openStage = m?.[2];

  return (
    <nav aria-label="บทเรียนรายสัปดาห์" className="px-3 pb-6 pt-4">
      {data ? (
        <div className="mb-4 rounded-md border border-line bg-panel px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold text-ink">ความก้าวหน้าทั้งรายวิชา</p>
            <span className="readout text-[0.9rem] text-ink-2">{Math.round(data.overallPercent)}%</span>
          </div>
          <ProgressBar value={data.overallPercent} label="ความก้าวหน้าทั้งรายวิชา" color="var(--copper)" className="mt-1.5" />
        </div>
      ) : null}
      <ol className="space-y-0.5">
        {weekMeta.map((w) => {
          const st = data?.weeks.find((s) => s.week === w.week);
          const locked = st ? !st.unlocked : false;
          const color = `var(${categoryInfo[w.category].cssVar})`;
          const isOpen = openWeek === w.week;
          const isHere = m ? Number(m[1]) === w.week : false;
          return (
            <li key={w.week}>
              <div className={cn("group relative flex items-center gap-2 rounded-sm pr-1", isHere ? "bg-cobalt-soft" : "hover:bg-panel-2")}>
                <span aria-hidden className="absolute inset-y-1 left-0 w-1 rounded-full" style={{ background: color }} />
                <Link
                  href={`/learn/${w.week}`}
                  onClick={close}
                  aria-current={isHere && !openStage ? "page" : undefined}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm py-1.5 pl-3"
                  prefetch={false}
                >
                  <span className="readout w-6 shrink-0 text-right text-[0.9rem] font-semibold text-ink-3">{w.week}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("line-clamp-2 text-[0.92rem] leading-snug", isHere ? "font-semibold text-ink" : "text-ink-2", locked && "text-ink-3")}>{w.title}</span>
                    <span className="block text-[0.78rem] leading-tight text-ink-3">{categoryInfo[w.category].label}</span>
                  </span>
                </Link>
                {locked ? (
                  <Tooltip content={st?.lockReason ?? "ยังไม่ปลดล็อก"} side="right">
                    <button type="button" className="grid size-9 shrink-0 place-items-center rounded-sm text-ink-3 hover:text-ink" aria-label={`สัปดาห์ที่ ${w.week} ล็อกอยู่`}>
                      <Lock className="size-4" aria-hidden />
                    </button>
                  </Tooltip>
                ) : st ? (
                  <span className="grid size-9 shrink-0 place-items-center">
                    {st.completed ? (
                      <span className="grid size-7 place-items-center rounded-full" style={{ background: color }} role="img" aria-label="เรียนจบแล้ว">
                        <Check className="size-4 text-white dark:text-paper" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <ProgressRing value={st.percent} size={28} stroke={3.5} color={color} label={`เรียนแล้ว ${st.percent}%`} />
                    )}
                  </span>
                ) : loading ? (
                  <span className="ee-skeleton mr-1 size-7 shrink-0 rounded-full" aria-hidden />
                ) : null}
              </div>
              {isOpen && !locked ? (
                <ol className="mb-1.5 ml-[2.35rem] mt-0.5 border-l-2 border-line-strong py-0.5" aria-label={`ขั้นตอนของสัปดาห์ที่ ${w.week}`}>
                  {stages.map((s) => {
                    const done = st?.stagesDone.includes(s.key);
                    const here = isHere && openStage === s.key;
                    const closed = st ? !st.stagesOpen.includes(s.key) : false;
                    if (closed) {
                      return (
                        <li key={s.key}>
                          <span className="-ml-[2px] flex items-center gap-2 border-l-2 border-transparent py-1 pl-3 pr-2 text-[0.88rem] text-ink-3" aria-disabled="true">
                            <span className="min-w-0 flex-1">{s.label}</span>
                            <Lock className="size-3.5" aria-label="ยังไม่เปิด ทำขั้นก่อนหน้าให้เสร็จก่อน" />
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={s.key}>
                        <Link
                          href={`/learn/${w.week}/${s.key}`}
                          onClick={close}
                          aria-current={here ? "page" : undefined}
                          className={cn(
                            "-ml-[2px] flex items-center gap-2 border-l-2 py-1 pl-3 pr-2 text-[0.88rem]",
                            here ? "border-copper font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink",
                          )}
                          prefetch={false}
                        >
                          <span className="min-w-0 flex-1">{s.label}</span>
                          {done ? <Check className="size-4 text-ok" aria-label="เสร็จแล้ว" /> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-5 space-y-0.5 border-t border-line pt-3">
        <Link href="/labs" onClick={close} className="flex items-center gap-2 rounded-sm px-3 py-2 text-ink-2 hover:bg-panel-2 hover:text-ink">
          <FlaskConical className="size-4" aria-hidden />
          ห้องทดลองเสมือนทั้งหมด
        </Link>
        {data ? (
          <Link href="/dashboard" onClick={close} className="flex items-center gap-2 rounded-sm px-3 py-2 text-ink-2 hover:bg-panel-2 hover:text-ink">
            <LayoutDashboard className="size-4" aria-hidden />
            แดชบอร์ดของฉัน
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
