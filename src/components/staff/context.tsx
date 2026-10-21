import "server-only";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/server/auth";
import { resolveClass, type ClassInfo } from "@/server/core/staff";
import { ClassPicker } from "./ClassPicker";

export type SP = Promise<Record<string, string | string[] | undefined>>;

export function spGetter(sp: Record<string, string | string[] | undefined>) {
  return (k: string): string | null => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? null;
  };
}

/** Resolve the staff user, query params and the selected class (only classes the user may manage). */
export async function teacherPage(searchParams: SP) {
  const me = await requireUser(["teacher", "admin"]);
  const one = spGetter(await searchParams);
  const { classes, current } = await resolveClass(db, { id: me.id, role: me.role }, one("class"));
  return { me, one, classes, current, viewer: { id: me.id, role: me.role } };
}

export function ClassBar({ classes, current, children }: { classes: ClassInfo[]; current: ClassInfo | null; children?: ReactNode }) {
  if (!current) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-panel px-4 py-3">
      <ClassPicker classes={classes} current={current.id} />
      {children}
    </div>
  );
}

export function NoClass({ isAdmin }: { isAdmin: boolean }) {
  return (
    <EmptyState title="ยังไม่มีห้องเรียนที่คุณสอน">
      {isAdmin ? "สร้างห้องเรียนและกำหนดครูประจำห้องได้ที่เมนู “ห้องเรียน” ของผู้ดูแลระบบ" : "ให้ผู้ดูแลระบบสร้างห้องเรียนและเพิ่มคุณเป็นครูประจำห้อง แล้วโหลดหน้านี้ใหม่"}
    </EmptyState>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด" className="space-y-4">
      <div className="h-9 w-64 animate-pulse rounded-sm bg-panel-2" />
      <div className="h-40 animate-pulse rounded-md bg-panel-2" />
      <div className="h-64 animate-pulse rounded-md bg-panel-2" />
    </div>
  );
}

/** GET form with a week <select> (keeps the class param). */
export function WeekFilter({ classId, week, extra, allowAll = false }: { classId: string | null; week: number | null; extra?: ReactNode; allowAll?: boolean }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      {classId ? <input type="hidden" name="class" value={classId} /> : null}
      <label className="space-y-1">
        <span className="block text-[0.9rem] text-ink-3">สัปดาห์</span>
        <select name="week" defaultValue={week ?? ""} className="h-10 rounded-sm border border-line-strong bg-panel px-2 text-ink">
          {allowAll ? <option value="">ทุกสัปดาห์</option> : null}
          {Array.from({ length: 18 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              สัปดาห์ที่ {i + 1}
            </option>
          ))}
        </select>
      </label>
      {extra}
      <button type="submit" className="h-10 rounded-sm border border-line-strong bg-panel px-3 font-semibold text-ink hover:bg-panel-2">
        แสดง
      </button>
    </form>
  );
}
