import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Badge, EmptyState, Field, Input, PageHeader, Panel, PanelHeader, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/staff/ActionForm";
import { PageSkeleton } from "@/components/staff/context";
import { requireUser } from "@/server/auth";
import { classroomsWithPeople } from "@/server/core/admin";
import { archiveClassroomAction, assignTeacherAction, createClassroomAction, enrolAction, joinCodeAction } from "@/server/actions/admin";

export const metadata: Metadata = { title: "ห้องเรียน" };

export default function ClassroomsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireUser(["admin"]);
  const classes = await classroomsWithPeople(db);
  return (
    <>
      <PageHeader title="ห้องเรียน" description="สร้างห้องเรียนตามภาคเรียน กำหนดครู และเพิ่ม/นำนักเรียนออก" />
      <Panel className="mb-6">
        <PanelHeader title="สร้างห้องเรียน" />
        <div className="p-4">
          <ActionForm action={createClassroomAction} submitLabel="สร้างห้องเรียน">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ชื่อห้อง" htmlFor="c-name" hint="เช่น ชฟ.1/2"><Input id="c-name" name="name" required maxLength={60} /></Field>
              <Field label="ภาคเรียน" htmlFor="c-term" hint="รูปแบบ 1/2569 หรือ 2/2569"><Input id="c-term" name="term" required pattern="[12S3]/[0-9]{4}" placeholder="2/2569" /></Field>
            </div>
          </ActionForm>
        </div>
      </Panel>
      {classes.length === 0 ? <EmptyState title="ยังไม่มีห้องเรียน" /> : (
        <div className="space-y-4">
          {classes.map((c) => (
            <Panel key={c.id} className={c.archived ? "opacity-75" : ""}>
              <PanelHeader
                title={<>{c.name} <span className="font-normal text-ink-3">ภาคเรียน {c.term}</span> {c.archived ? <Badge>เก็บเข้าคลัง</Badge> : null}</>}
                description={`นักเรียน ${c.students} คน · รหัสเข้าห้อง ${c.joinCode ?? "–"} · ครู: ${c.teachers.map((t) => t.name).join(", ") || "ยังไม่กำหนด"}`}
                action={
                  <div className="flex flex-wrap gap-2">
                    <ActionForm action={joinCodeAction} submitLabel="สร้างรหัสห้องใหม่" variant="ghost" size="sm" inline><input type="hidden" name="classId" value={c.id} /></ActionForm>
                    <ActionForm action={archiveClassroomAction} submitLabel={c.archived ? "นำกลับมาใช้" : "เก็บเข้าคลัง"} variant="secondary" size="sm" inline confirm={c.archived ? undefined : `เก็บห้อง ${c.name} เข้าคลัง? นักเรียนจะไม่ใช้เกณฑ์ของห้องนี้อีก`}>
                      <input type="hidden" name="classId" value={c.id} />
                      <input type="hidden" name="archived" value={c.archived ? "0" : "1"} />
                    </ActionForm>
                  </div>
                }
              />
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold">ครูประจำห้อง</h3>
                  {c.teachers.length ? (
                    <ul className="space-y-1">
                      {c.teachers.map((t) => (
                        <li key={t.username ?? t.name} className="flex items-center justify-between gap-2">
                          <span>{t.name} <span className="readout text-ink-3">{t.username}</span></span>
                          {t.username ? (
                            <ActionForm action={assignTeacherAction} submitLabel="นำออก" variant="ghost" size="sm" inline>
                              <input type="hidden" name="classId" value={c.id} />
                              <input type="hidden" name="username" value={t.username} />
                              <input type="hidden" name="assign" value="0" />
                            </ActionForm>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <ActionForm action={assignTeacherAction} submitLabel="เพิ่มครู" size="sm" inline>
                    <input type="hidden" name="classId" value={c.id} />
                    <input type="hidden" name="assign" value="1" />
                    <Input name="username" required placeholder="ชื่อผู้ใช้ของครู" aria-label="ชื่อผู้ใช้ของครู" className="h-9 w-56" />
                  </ActionForm>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">เพิ่ม/นำนักเรียนออก</h3>
                  <ActionForm action={enrolAction} submitLabel="เพิ่มเข้าห้อง" size="sm">
                    <input type="hidden" name="classId" value={c.id} />
                    <input type="hidden" name="enrol" value="1" />
                    <Textarea name="usernames" required rows={2} placeholder="ชื่อผู้ใช้ คั่นด้วยเว้นวรรค จุลภาค หรือขึ้นบรรทัดใหม่" aria-label="ชื่อผู้ใช้นักเรียนที่จะเพิ่ม" />
                  </ActionForm>
                  <ActionForm action={enrolAction} submitLabel="นำออกจากห้อง" variant="ghost" size="sm">
                    <input type="hidden" name="classId" value={c.id} />
                    <input type="hidden" name="enrol" value="0" />
                    <Textarea name="usernames" required rows={1} placeholder="ชื่อผู้ใช้ที่จะนำออก" aria-label="ชื่อผู้ใช้นักเรียนที่จะนำออก" />
                  </ActionForm>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
