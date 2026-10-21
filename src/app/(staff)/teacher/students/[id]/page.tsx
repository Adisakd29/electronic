import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { stages } from "@/content/course";
import { db } from "@/lib/db";
import { Alert, Badge, DataTable, EmptyState, Input, PageHeader, Panel, PanelHeader, ProgressBar, Stat, Td, Th } from "@/components/ui";
import { ActionForm } from "@/components/staff/ActionForm";
import { CompetencyDomainsPanel } from "@/components/staff/CompetencyDomains";
import { PageSkeleton, spGetter, type SP } from "@/components/staff/context";
import { fmtDateTime, kindLabel, levelLabel, pct, statusLabel } from "@/components/staff/format";
import { requireUser } from "@/server/auth";
import { studentDetail } from "@/server/core/staff";
import {
  grantOverrideAction,
  issueCertificateAction,
  resetPasswordAction,
  revokeCertificateAction,
  revokeOverrideAction,
} from "@/server/actions/teacher";

export const metadata: Metadata = { title: "รายละเอียดนักเรียน" };

type Params = Promise<{ id: string }>;

export default function StudentPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const stageShort = Object.fromEntries(stages.map((s) => [s.key, s.label]));

async function Body({ params, searchParams }: { params: Params; searchParams: SP }) {
  const me = await requireUser(["teacher", "admin"]);
  const { id } = await params;
  const one = spGetter(await searchParams);
  const d = await studentDetail(db, { id: me.id, role: me.role }, id);
  const back = `/teacher/students${one("class") ? `?class=${one("class")}` : ""}`;
  if (!d) {
    return (
      <EmptyState title="ไม่พบนักเรียน หรือคุณไม่มีสิทธิ์ดูข้อมูลนักเรียนคนนี้" action={<Link className="font-semibold text-cobalt hover:underline" href={back}>กลับไปรายชื่อนักเรียน</Link>}>
        ครูดูข้อมูลได้เฉพาะนักเรียนในห้องเรียนที่ตนสอน
      </EmptyState>
    );
  }
  const u = d.user;
  return (
    <>
      <PageHeader
        kicker={<Link href={back} className="hover:underline">← รายชื่อนักเรียน</Link>}
        title={u.name}
        description={[u.studentNo ? `เลขประจำตัว ${u.studentNo}` : null, u.username ? `ชื่อผู้ใช้ ${u.username}` : u.email, d.classrooms.map((c) => `${c.name} (${c.term})`).join(", ")].filter(Boolean).join(" · ")}
      />
      {u.disabled ? <Alert tone="danger" className="mb-4">บัญชีนี้ถูกปิดใช้งาน นักเรียนเข้าสู่ระบบไม่ได้</Alert> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="เรียนจบ" value={`${d.eligibility.weeksCompleted}/18`} hint="สัปดาห์" />
        <Stat label="XP" value={d.xp} hint={`ระดับ ${d.level.level} ${d.level.levelName}`} />
        <Stat label="เหรียญรางวัล" value={d.achievements.length} />
        <Stat label="เกียรติบัตร" value={d.certificate && !d.certificate.revoked ? "ได้รับแล้ว" : "ยังไม่ได้รับ"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="ความก้าวหน้ารายสัปดาห์" />
          <div className="p-4">
            <DataTable caption="สถานะรายสัปดาห์">
              <thead><tr><Th>สัปดาห์</Th><Th>สถานะ</Th><Th className="min-w-36">ขั้นตอนที่ผ่าน</Th><Th>หลังเรียนสูงสุด</Th></tr></thead>
              <tbody>
                {d.weeks.map((w) => (
                  <tr key={w.week}>
                    <Td>{w.week}</Td>
                    <Td>
                      {w.completed ? <Badge tone="ok">จบแล้ว</Badge> : w.unlocked ? (w.started ? <Badge tone="info">กำลังเรียน</Badge> : <Badge>ปลดล็อกแล้ว</Badge>) : <Badge tone="neutral">ล็อก</Badge>}
                      {!w.unlocked && w.lockReason ? <div className="mt-1 max-w-72 text-[0.85rem] text-ink-3">{w.lockReason}</div> : null}
                    </Td>
                    <Td>
                      <ProgressBar value={w.percent} label={`สัปดาห์ ${w.week}`} />
                      <div className="mt-1 text-[0.85rem] text-ink-3">{w.stagesDone.map((s) => stageShort[s]).join(" · ") || "–"}</div>
                    </Td>
                    <Td>{pct(w.quizBestPercent)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="ปลดล็อกสัปดาห์ให้นักเรียนคนนี้" description="ใช้เมื่อนักเรียนมีเหตุจำเป็น เช่น ลาป่วย หรือทำงานชดเชยแล้ว" />
            <div className="space-y-4 p-4">
              <ActionForm action={grantOverrideAction} submitLabel="ปลดล็อก">
                <input type="hidden" name="studentId" value={u.id} />
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">สัปดาห์</span>
                    <select name="week" className="h-11 w-full rounded-sm border border-line-strong bg-panel px-2">{Array.from({ length: 17 }, (_, i) => <option key={i + 2} value={i + 2}>สัปดาห์ที่ {i + 2}</option>)}</select>
                  </label>
                  <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">หมายเหตุ</span><Input name="note" maxLength={200} placeholder="ไม่บังคับ" /></label>
                </div>
              </ActionForm>
              {d.overrides.length ? (
                <ul className="space-y-2">
                  {d.overrides.map((o) => (
                    <li key={o.week} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line px-3 py-2">
                      <span>สัปดาห์ที่ {o.week}{o.note ? <span className="text-ink-3"> — {o.note}</span> : null}</span>
                      <ActionForm action={revokeOverrideAction} submitLabel="ยกเลิก" variant="ghost" size="sm" inline>
                        <input type="hidden" name="studentId" value={u.id} />
                        <input type="hidden" name="week" value={o.week} />
                      </ActionForm>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Panel>
          {u.username ? (
            <Panel>
              <PanelHeader title="รีเซ็ตรหัสผ่าน" description="สร้างรหัสผ่านชั่วคราว นักเรียนต้องตั้งรหัสใหม่เมื่อเข้าสู่ระบบครั้งถัดไป" />
              <div className="p-4">
                <ActionForm action={resetPasswordAction} submitLabel="สร้างรหัสผ่านชั่วคราว" variant="secondary" confirm="ยืนยันการรีเซ็ตรหัสผ่าน? นักเรียนจะถูกออกจากระบบทุกอุปกรณ์">
                  <input type="hidden" name="userId" value={u.id} />
                </ActionForm>
              </div>
            </Panel>
          ) : null}
          <Panel>
            <PanelHeader title="เกียรติบัตร (Certificate of Completion)" description="ออกได้เมื่อเรียนจบครบ 18 สัปดาห์ และผ่านการประเมินสมรรถนะปลายภาค" />
            <div className="space-y-3 p-4">
              {d.certificate && !d.certificate.revoked ? (
                <>
                  <p>
                    รหัสตรวจสอบ <code className="readout">{d.certificate.code}</code> · ออกเมื่อ {fmtDateTime(d.certificate.issuedAt)}
                  </p>
                  <Link className="font-semibold text-cobalt hover:underline" href={`/certificate/${d.certificate.code}`} target="_blank">เปิดเกียรติบัตร</Link>
                  <ActionForm action={revokeCertificateAction} submitLabel="ยกเลิกเกียรติบัตร" variant="ghost" size="sm" confirm="ยืนยันการยกเลิกเกียรติบัตร?">
                    <input type="hidden" name="studentId" value={u.id} />
                  </ActionForm>
                </>
              ) : (
                <>
                  <ul className="space-y-1 text-[0.95rem]">
                    <li>{d.eligibility.allComplete ? "✓" : "✗"} เรียนจบครบ 18 สัปดาห์ ({d.eligibility.weeksCompleted}/18)</li>
                    <li>{d.eligibility.finalPassed ? "✓" : "✗"} ผ่านการประเมินสมรรถนะปลายภาค</li>
                  </ul>
                  <ActionForm action={issueCertificateAction} submitLabel="ออกเกียรติบัตร" variant="ok">
                    <input type="hidden" name="studentId" value={u.id} />
                  </ActionForm>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <CompetencyDomainsPanel profile={d.competencyProfile} title="สมรรถนะ 4 ด้าน (มุมมองจากหลักฐานการเรียน)" showGaps />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="ผลแบบทดสอบ" />
          <div className="p-4">
            {d.attempts.length === 0 ? <p className="text-ink-3">ยังไม่ได้ทำแบบทดสอบ</p> : (
              <DataTable caption="ผลแบบทดสอบ">
                <thead><tr><Th>สัปดาห์</Th><Th>ชนิด</Th><Th>คะแนน</Th><Th>ผล</Th><Th>เวลา</Th></tr></thead>
                <tbody>
                  {d.attempts.map((a) => (
                    <tr key={a.id}>
                      <Td>{a.week}</Td><Td>{kindLabel[a.kind]}</Td><Td>{a.score}/{a.maxScore} ({pct(a.percent)})</Td>
                      <Td>{a.kind === "pre" ? "–" : a.passed ? <Badge tone="ok">ผ่าน</Badge> : <Badge tone="danger">ไม่ผ่าน</Badge>}</Td>
                      <Td className="whitespace-nowrap">{fmtDateTime(a.submittedAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="ผลภารกิจห้องทดลองเสมือน" />
          <div className="p-4">
            {d.labs.length === 0 ? <p className="text-ink-3">ยังไม่ได้ทำภารกิจห้องทดลอง</p> : (
              <DataTable caption="ผลภารกิจห้องทดลอง">
                <thead><tr><Th>สัปดาห์</Th><Th>ภารกิจ</Th><Th>ผล</Th><Th>จำนวนครั้ง</Th><Th>ค่าที่ส่งล่าสุด</Th></tr></thead>
                <tbody>
                  {d.labs.map((l) => (
                    <tr key={l.taskId}><Td>{l.week}</Td><Td className="readout">{l.taskId}</Td><Td>{l.correct ? <Badge tone="ok">ถูกต้อง</Badge> : <Badge tone="warn">ยังไม่ถูก</Badge>}</Td><Td>{l.attempts}</Td><Td>{l.value ?? "–"}</Td></tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="กิจกรรมในบทเรียนที่ตอบผิด" description="เรียงจากจำนวนครั้งที่ตอบผิดมากที่สุด" />
          <div className="p-4">
            {d.interactionErrors.length === 0 ? <p className="text-ink-3">ยังไม่มีข้อมูลการตอบผิด</p> : (
              <DataTable caption="กิจกรรมที่ตอบผิด">
                <thead><tr><Th>กิจกรรม</Th><Th>ผิด/ทั้งหมด</Th><Th>ตอบถูกแล้ว</Th><Th>คำตอบผิดล่าสุด</Th></tr></thead>
                <tbody>
                  {d.interactionErrors.slice(0, 30).map((i) => (
                    <tr key={i.interactionId}><Td className="readout">{i.interactionId}</Td><Td>{i.wrongAttempts}/{i.attempts}</Td><Td>{i.correct ? "✓" : "✗"}</Td><Td>{i.lastWrong ?? "–"}</Td></tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="ใบงานที่ส่ง" />
          <div className="p-4">
            {d.submissions.length === 0 ? <p className="text-ink-3">ยังไม่ได้ส่งใบงาน</p> : (
              <DataTable caption="ใบงานที่ส่ง">
                <thead><tr><Th>ใบงาน</Th><Th>สถานะ</Th><Th>คะแนน</Th><Th></Th></tr></thead>
                <tbody>
                  {d.submissions.map((x) => (
                    <tr key={x.id}>
                      <Td>W{x.week} · {x.title}</Td><Td>{statusLabel[x.status]}</Td><Td>{x.score != null ? `${x.score}/${x.maxScore}` : "–"}</Td>
                      <Td><Link className="text-cobalt hover:underline" href={`/teacher/submissions/${x.id}${one("class") ? `?class=${one("class")}` : ""}`}>ตรวจ</Link></Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="ผลประเมินสมรรถนะ" />
          <div className="p-4">
            {d.competencies.length === 0 ? <p className="text-ink-3">ยังไม่ได้บันทึกผลการประเมิน (บันทึกได้ที่เมนู “ประเมินสมรรถนะ”)</p> : (
              <ul className="space-y-1">
                {d.competencies.map((c) => (
                  <li key={c.id}>
                    {c.competency === 0 ? "ประเมินปลายภาค" : `สมรรถนะที่ ${c.competency}`}: ระดับ {c.level} ({levelLabel[c.level]}) {c.score != null ? `· ${c.score}/${c.maxScore ?? "–"}` : ""} · {c.passed ? "ผ่าน" : "ไม่ผ่าน"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="เหรียญรางวัล" />
          <div className="flex flex-wrap gap-2 p-4">
            {d.achievements.length === 0 ? <p className="text-ink-3">ยังไม่ได้รับเหรียญ</p> : d.achievements.map((a) => <Badge key={a.code} tone="copper">{a.title}</Badge>)}
          </div>
        </Panel>
      </div>
    </>
  );
}
