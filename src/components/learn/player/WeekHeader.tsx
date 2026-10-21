/** Static week header (prerendered): category bar, unit, Thai + English title. */
import { categoryInfo } from "@/content/course";
import type { Category } from "@/content/types";

export function WeekHeader({
  week,
  title,
  titleEn,
  category,
  unitNo,
  hours,
  children,
}: {
  week: number;
  title: string;
  titleEn: string;
  category: Category;
  unitNo?: number;
  hours?: { theory: number; practice: number };
  children?: React.ReactNode;
}) {
  const cat = categoryInfo[category];
  const color = `var(${cat.cssVar})`;
  return (
    <header className="ee-week-header relative mb-5 overflow-hidden rounded-md border border-line bg-panel pl-5 pr-4 pt-4 pb-3 shadow-1 sm:pl-6">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[6px]" style={{ background: color }} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.92rem] text-ink-3">
        <span className="font-semibold text-ink-2">สัปดาห์ที่ {week}</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: color }} />
          {cat.label}
        </span>
        {unitNo ? <span>หน่วยที่ {unitNo}</span> : null}
        {hours ? (
          <span>
            ทฤษฎี {hours.theory} ชม. ปฏิบัติ {hours.practice} ชม.
          </span>
        ) : null}
      </div>
      <h1 className="mt-1 text-[1.45rem] font-bold leading-snug text-ink md:text-[1.75rem]">{title}</h1>
      <p className="text-[0.95rem] text-ink-3" lang="en">
        {titleEn}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
