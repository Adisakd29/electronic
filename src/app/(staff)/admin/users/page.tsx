import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Badge, DataTable, EmptyState, Field, Input, PageHeader, Panel, PanelHeader, Select, Td, Th } from "@/components/ui";
import { ActionForm } from "@/components/staff/ActionForm";
import { PageSkeleton, spGetter, type SP } from "@/components/staff/context";
import { roleLabel } from "@/components/staff/format";
import { requireUser } from "@/server/auth";
import { classroomsWithPeople, searchUsers } from "@/server/core/admin";
import { adminResetPasswordAction, createUserAction, setDisabledAction, setRoleAction } from "@/server/actions/admin";

export const metadata: Metadata = { title: "ผู้ใช้" };

export default function UsersPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const me = await requireUser(["admin"]);
  const one = spGetter(await searchParams);
  const [users, classes] = await Promise.all([searchUsers(db, one("q")?.slice(0, 80) ?? null, one("role")), classroomsWithPeople(db)]);
  return (
    <>
      <PageHeader title="ผู้ใช้" description="ค้นหา สร้างบัญชี เปลี่ยนบทบาท ปิด/เปิดใช้งาน และรีเซ็ตรหัสผ่าน" />
      <Panel className="mb-6">
        <PanelHeader title="สร้างบัญชีใหม่" description="ระบบสร้างรหัสผ่านชั่วคราว ผู้ใช้ต้องเปลี่ยนเมื่อเข้าสู่ระบบครั้งแรก" />
        <div className="p-4">
          <ActionForm action={createUserAction} submitLabel="สร้างบัญชี">
            <div className="grid gap-3 md:grid-cols-5">
              <Field label="ชื่อผู้ใช้" htmlFor="nu-username"><Input id="nu-username" name="username" required pattern="[a-z0-9_.]{3,32}" autoCapitalize="none" /></Field>
              <Field label="ชื่อ-นามสกุล" htmlFor="nu-name"><Input id="nu-name" name="name" required maxLength={120} /></Field>
              <Field label="บทบาท" htmlFor="nu-role"><Select id="nu-role" name="role" defaultValue="student"><option value="student">นักเรียน</option><option value="teacher">ครู</option><option value="admin">ผู้ดูแลระบบ</option></Select></Field>
              <Field label="เลขประจำตัว" htmlFor="nu-no"><Input id="nu-no" name="studentNo" maxLength={32} /></Field>
              <Field label="ห้องเรียน" htmlFor="nu-class"><Select id="nu-class" name="classroomId" defaultValue=""><option value="">— ไม่ระบุ —</option>{classes.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.term})</option>)}</Select></Field>
            </div>
          </ActionForm>
        </div>
      </Panel>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">ค้นหา</span><input name="q" defaultValue={one("q") ?? ""} placeholder="ชื่อ ชื่อผู้ใช้ อีเมล เลขประจำตัว" className="h-10 w-72 rounded-sm border border-line-strong bg-panel px-3" /></label>
        <label className="space-y-1"><span className="block text-[0.9rem] text-ink-3">บทบาท</span><select name="role" defaultValue={one("role") ?? ""} className="h-10 rounded-sm border border-line-strong bg-panel px-2"><option value="">ทั้งหมด</option><option value="student">นักเรียน</option><option value="teacher">ครู</option><option value="admin">ผู้ดูแลระบบ</option></select></label>
        <button type="submit" className="h-10 rounded-sm border border-line-strong px-3 font-semibold hover:bg-panel-2">ค้นหา</button>
      </form>
      {users.length === 0 ? <EmptyState title="ไม่พบผู้ใช้" /> : (
        <DataTable caption="ผู้ใช้">
          <thead><tr><Th>ชื่อ</Th><Th>บัญชี</Th><Th>บทบาท</Th><Th>สถานะ</Th><Th>จัดการ</Th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.name}<div className="readout text-[0.85rem] text-ink-3">{u.studentNo ?? ""}</div></Td>
                <Td className="readout">{u.username ?? u.email}</Td>
                <Td>
                  <ActionForm action={setRoleAction} submitLabel="เปลี่ยน" variant="ghost" size="sm" inline>
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} aria-label={`บทบาทของ ${u.name}`} className="h-9 rounded-sm border border-line-strong bg-panel px-2" disabled={u.id === me.id}>
                      {Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </ActionForm>
                </Td>
                <Td>{u.disabled ? <Badge tone="danger">ปิดใช้งาน</Badge> : <Badge tone="ok">ใช้งาน</Badge>}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {u.id !== me.id ? (
                      <ActionForm action={setDisabledAction} submitLabel={u.disabled ? "เปิดใช้งาน" : "ปิดใช้งาน"} variant={u.disabled ? "secondary" : "ghost"} size="sm" inline confirm={u.disabled ? undefined : `ปิดใช้งานบัญชี ${u.name}? ผู้ใช้จะถูกออกจากระบบทันที`}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="disabled" value={u.disabled ? "0" : "1"} />
                      </ActionForm>
                    ) : null}
                    {u.username ? (
                      <ActionForm action={adminResetPasswordAction} submitLabel="รีเซ็ตรหัสผ่าน" variant="ghost" size="sm" inline confirm={`รีเซ็ตรหัสผ่านของ ${u.name}?`}>
                        <input type="hidden" name="userId" value={u.id} />
                      </ActionForm>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {users.length === 200 ? <p className="mt-2 text-ink-3">แสดง 200 รายการแรก — ค้นหาให้เจาะจงขึ้น</p> : null}
    </>
  );
}
