import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { allowedEmail } from "@/lib/db/schema";
import { DataTable, Field, Input, PageHeader, Panel, PanelHeader, Select, Td, Textarea, Th } from "@/components/ui";
import { tracks } from "@/content/course";
import { ActionForm } from "@/components/staff/ActionForm";
import { ClassBar, NoClass, PageSkeleton, teacherPage, type SP } from "@/components/staff/context";
import { googleEnabled } from "@/lib/env";
import { classStudents } from "@/server/core/staff";
import { addAllowlistAction, bulkCreateStudentsAction, removeAllowlistAction, resetPasswordAction, setClassTrackAction, unenrolStudentAction } from "@/server/actions/teacher";

export const metadata: Metadata = { title: "บัญชีนักเรียน" };

export default function ClassPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="บัญชีนักเรียน" /><NoClass isAdmin={me.role === "admin"} /></>);
  const [students, allow] = await Promise.all([classStudents(db, current.id), db.select().from(allowedEmail).where(eq(allowedEmail.classroomId, current.id))]);
  return (
    <>
      <PageHeader title="บัญชีนักเรียน" description={`ห้อง ${current.name} ภาคเรียน ${current.term}${current.joinCode ? ` · รหัสห้อง ${current.joinCode}` : ""}`} />
      <ClassBar classes={classes} current={current} />
      <Panel className="mb-6">
        <PanelHeader
          title="แผนกของห้องนี้"
          description="บทเรียนจะแสดงตัวอย่าง “ในงานแผนกของคุณ” ตามแผนกนี้ให้นักเรียนทุกคนในห้อง นักเรียนเปลี่ยนเป็นแผนกของตัวเองได้ เนื้อหา ข้อสอบ และเกณฑ์ประเมินเหมือนกันทุกแผนก"
        />
        <div className="p-4">
          <ActionForm action={setClassTrackAction} submitLabel="บันทึกแผนก" inline>
            <input type="hidden" name="classId" value={current.id} />
            <label htmlFor="class-track" className="sr-only">แผนกของห้อง</label>
            <Select id="class-track" name="track" defaultValue={current.track ?? ""} className="w-80 max-w-full">
              <option value="">ทั่วไป (ไม่ระบุแผนก)</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </ActionForm>
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="สร้างบัญชีนักเรียนหลายคนพร้อมกัน" description="วางรายชื่อ บรรทัดละ 1 คน: username,ชื่อ-นามสกุล,เลขประจำตัว" />
          <div className="p-4">
            <ActionForm action={bulkCreateStudentsAction} submitLabel="สร้างบัญชี" pendingLabel="กำลังสร้างบัญชี…">
              <input type="hidden" name="classId" value={current.id} />
              <Field label="รายชื่อนักเรียน" htmlFor="lines" hint="username ใช้ a–z 0–9 _ . เท่านั้น ระบบสร้างรหัสผ่านชั่วคราวให้ และนักเรียนต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งแรก">
                <Textarea id="lines" name="lines" rows={8} required placeholder={"s66001,นายสมชาย ใจดี,66001\ns66002,นางสาวสมหญิง รักเรียน,66002"} className="readout" />
              </Field>
            </ActionForm>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="อีเมล Google ที่อนุญาต" description={googleEnabled() ? "นักเรียนที่ใช้อีเมลเหล่านี้เข้าสู่ระบบด้วย Google จะถูกเพิ่มเข้าห้องนี้อัตโนมัติ" : "ระบบยังไม่ได้ตั้งค่า Google sign-in (ผู้ดูแลต้องใส่ GOOGLE_CLIENT_ID/SECRET) — รายการนี้จะใช้ได้เมื่อเปิดใช้"} />
          <div className="space-y-4 p-4">
            <ActionForm action={addAllowlistAction} submitLabel="เพิ่มอีเมล" inline>
              <input type="hidden" name="classId" value={current.id} />
              <input type="hidden" name="role" value="student" />
              <label htmlFor="pattern" className="sr-only">อีเมล</label>
              <Input id="pattern" name="pattern" type="email" required placeholder="student@school.ac.th" className="w-72" />
            </ActionForm>
            {allow.length ? (
              <ul className="divide-y divide-line rounded-sm border border-line">
                {allow.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="readout">{a.pattern}</span>
                    <ActionForm action={removeAllowlistAction} submitLabel="ลบ" variant="ghost" size="sm" inline confirm={`ลบ ${a.pattern}?`}>
                      <input type="hidden" name="id" value={a.id} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ) : <p className="text-ink-3">ยังไม่มีอีเมลที่อนุญาตสำหรับห้องนี้</p>}
          </div>
        </Panel>
      </div>
      <Panel className="mt-6">
        <PanelHeader title={`นักเรียนในห้อง (${students.length} คน)`} />
        <div className="p-4">
          {students.length === 0 ? <p className="text-ink-3">ยังไม่มีนักเรียน</p> : (
            <DataTable caption="นักเรียนในห้อง">
              <thead><tr><Th>เลขประจำตัว</Th><Th>ชื่อ</Th><Th>ชื่อผู้ใช้</Th><Th>จัดการ</Th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <Td className="readout">{s.studentNo ?? "–"}</Td>
                    <Td>{s.name}</Td>
                    <Td className="readout">{s.username ?? "(Google)"}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        {s.username ? (
                          <ActionForm action={resetPasswordAction} submitLabel="รีเซ็ตรหัสผ่าน" variant="secondary" size="sm" inline confirm={`รีเซ็ตรหัสผ่านของ ${s.name}?`}>
                            <input type="hidden" name="userId" value={s.id} />
                          </ActionForm>
                        ) : null}
                        {s.username ? (
                          <ActionForm action={unenrolStudentAction} submitLabel="นำออกจากห้อง" variant="ghost" size="sm" inline confirm={`นำ ${s.name} ออกจากห้อง? (ข้อมูลการเรียนยังอยู่)`}>
                            <input type="hidden" name="classId" value={current.id} />
                            <input type="hidden" name="username" value={s.username} />
                          </ActionForm>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>
      </Panel>
    </>
  );
}
