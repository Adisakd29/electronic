import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import type { UnlockRule } from "@/lib/db/schema";
import { Alert, DataTable, PageHeader, Panel, PanelHeader, Td, Th } from "@/components/ui";
import { ActionForm } from "@/components/staff/ActionForm";
import { ClassBar, NoClass, PageSkeleton, teacherPage, type SP } from "@/components/staff/context";
import { unlockSettings } from "@/server/core/staff";
import { weekTitle } from "@/server/content";
import { revokeOverrideAction, saveUnlockPolicyAction, setWeekOpenAction } from "@/server/actions/teacher";

export const metadata: Metadata = { title: "การปลดล็อกบทเรียน" };

export default function UnlockPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

function RuleFields({ prefix, rule }: { prefix: string; rule: UnlockRule }) {
  const box = (name: keyof UnlockRule, label: string) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={`${prefix}${name}`} defaultChecked={Boolean(rule[name])} />
      {label}
    </label>
  );
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {box("requireLearn", "เรียนเนื้อหาครบทุกหัวข้อ")}
      {box("requirePractice", "ผ่านแบบฝึกเชิงโต้ตอบ")}
      {box("requireLab", "ทำห้องทดลองเสมือนครบ")}
      {box("requireAssignments", "ส่งใบงานครบ")}
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name={`${prefix}requireStageOrder`} defaultChecked={rule.requireStageOrder !== false} />
        ต้องเรียนตามลำดับขั้นในสัปดาห์ (บทนำ → เรียนรู้ → ฝึกปฏิบัติ → ห้องทดลอง → แบบทดสอบ → สรุป) ปิดเมื่อต้องการให้นักเรียนเปิดทุกขั้นได้
      </label>
      <label className="flex items-center gap-2">
        แบบทดสอบหลังเรียนอย่างน้อย
        <input type="number" name={`${prefix}minQuizPercent`} min={0} max={100} defaultValue={rule.minQuizPercent} className="h-9 w-20 rounded-sm border border-line-strong bg-panel px-2" />% (0 = ไม่บังคับ)
      </label>
    </div>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="การปลดล็อกบทเรียน" /><NoClass isAdmin={me.role === "admin"} /></>);
  const s = await unlockSettings(db, current.id);
  const p = s.policy;
  return (
    <>
      <PageHeader title="การปลดล็อกบทเรียน" description="กำหนดเกณฑ์ที่นักเรียนต้องทำในสัปดาห์ก่อนหน้าจึงจะเรียนสัปดาห์ถัดไปได้ สัปดาห์ที่ 1 เปิดเสมอ" />
      <ClassBar classes={classes} current={current} />
      {!s.saved ? <Alert tone="info" className="mb-4">ห้องนี้ใช้เกณฑ์มาตรฐานของระบบ (เรียนครบ + แบบฝึก + ห้องทดลอง + แบบทดสอบ ≥ 60 %) จนกว่าจะบันทึกเกณฑ์ของห้อง</Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader title="เกณฑ์การปลดล็อก" />
          <div className="p-4">
            <ActionForm action={saveUnlockPolicyAction} submitLabel="บันทึกเกณฑ์">
              <input type="hidden" name="classId" value={current.id} />
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" name="enabled" defaultChecked={p.enabled} />
                เปิดใช้ระบบล็อกบทเรียน (ถ้าปิด นักเรียนเข้าเรียนได้ทุกสัปดาห์)
              </label>
              <fieldset className="rounded-sm border border-line p-3">
                <legend className="px-1 font-semibold">เกณฑ์มาตรฐาน (ใช้กับทุกสัปดาห์)</legend>
                <RuleFields prefix="d-" rule={p.defaultRule} />
              </fieldset>
              <details>
                <summary className="cursor-pointer font-semibold">กำหนดเกณฑ์เฉพาะบางสัปดาห์</summary>
                <div className="mt-3 space-y-3">
                  {Array.from({ length: 17 }, (_, i) => i + 2).map((w) => {
                    const custom = p.weekRules[String(w)];
                    return (
                      <fieldset key={w} className="rounded-sm border border-line p-3">
                        <legend className="px-1">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name={`w${w}-custom`} defaultChecked={Boolean(custom)} />
                            เปิดสัปดาห์ที่ {w} เมื่อทำสัปดาห์ที่ {w - 1} ได้ตามเกณฑ์นี้
                          </label>
                        </legend>
                        <RuleFields prefix={`w${w}-`} rule={custom ?? p.defaultRule} />
                      </fieldset>
                    );
                  })}
                </div>
              </details>
            </ActionForm>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="เปิดสัปดาห์ให้ทั้งห้อง" description="เปิดทันทีโดยไม่ต้องผ่านเกณฑ์" />
            <ul className="divide-y divide-line">
              {Array.from({ length: 17 }, (_, i) => i + 2).map((w) => {
                const open = p.openedWeeks.includes(w);
                return (
                  <li key={w} className="flex items-center justify-between gap-2 px-4 py-2">
                    <span className="min-w-0 truncate" title={weekTitle(w)}>สัปดาห์ที่ {w}</span>
                    <ActionForm action={setWeekOpenAction} submitLabel={open ? "ยกเลิกการเปิด" : "เปิดให้ทั้งห้อง"} variant={open ? "ghost" : "secondary"} size="sm" inline>
                      <input type="hidden" name="classId" value={current.id} />
                      <input type="hidden" name="week" value={w} />
                      <input type="hidden" name="open" value={open ? "0" : "1"} />
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="ปลดล็อกรายบุคคล" description="เพิ่มได้ที่หน้ารายละเอียดนักเรียน" />
            <div className="p-4">
              {s.overrides.length === 0 ? <p className="text-ink-3">ยังไม่มี</p> : (
                <DataTable caption="การปลดล็อกรายบุคคล">
                  <thead><tr><Th>นักเรียน</Th><Th>สัปดาห์</Th><Th></Th></tr></thead>
                  <tbody>
                    {s.overrides.map((o) => (
                      <tr key={`${o.userId}-${o.week}`}>
                        <Td><Link className="text-cobalt hover:underline" href={`/teacher/students/${o.userId}?class=${current.id}`}>{o.name}</Link>{o.note ? <div className="text-[0.85rem] text-ink-3">{o.note}</div> : null}</Td>
                        <Td>{o.week}</Td>
                        <Td>
                          <ActionForm action={revokeOverrideAction} submitLabel="ยกเลิก" variant="ghost" size="sm" inline>
                            <input type="hidden" name="studentId" value={o.userId} />
                            <input type="hidden" name="week" value={o.week} />
                          </ActionForm>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
