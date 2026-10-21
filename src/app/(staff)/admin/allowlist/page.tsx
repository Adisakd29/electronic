import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { googleEnabled } from "@/lib/env";
import { Alert, DataTable, EmptyState, Field, Input, PageHeader, Panel, PanelHeader, Select, Td, Th } from "@/components/ui";
import { ActionForm } from "@/components/staff/ActionForm";
import { PageSkeleton } from "@/components/staff/context";
import { roleLabel } from "@/components/staff/format";
import { requireUser } from "@/server/auth";
import { allowlistAll, classroomsWithPeople } from "@/server/core/admin";
import { addAllowlistAction, removeAllowlistAction } from "@/server/actions/teacher";

export const metadata: Metadata = { title: "อีเมล Google ที่อนุญาต" };

export default function AllowlistPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireUser(["admin"]);
  const [rows, classes] = await Promise.all([allowlistAll(db), classroomsWithPeople(db)]);
  return (
    <>
      <PageHeader title="อีเมล Google ที่อนุญาต" description="เฉพาะอีเมลหรือโดเมนในรายการนี้เท่านั้นที่เข้าสู่ระบบด้วย Google ได้ ผู้ใช้ใหม่จะได้บทบาทและห้องเรียนตามรายการ" />
      {!googleEnabled() ? <Alert tone="info" className="mb-4">ยังไม่ได้เปิดใช้ Google sign-in — ตั้งค่า GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET (Redirect URI: &lt;BETTER_AUTH_URL&gt;/api/auth/callback/google)</Alert> : null}
      <Panel className="mb-6">
        <PanelHeader title="เพิ่มรายการ" />
        <div className="p-4">
          <ActionForm action={addAllowlistAction} submitLabel="เพิ่ม">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="อีเมล หรือ *@โดเมน" htmlFor="a-pattern" hint="เช่น somchai@school.ac.th หรือ *@school.ac.th"><Input id="a-pattern" name="pattern" required /></Field>
              <Field label="บทบาท" htmlFor="a-role"><Select id="a-role" name="role" defaultValue="student"><option value="student">นักเรียน</option><option value="teacher">ครู</option><option value="admin">ผู้ดูแลระบบ</option></Select></Field>
              <Field label="ห้องเรียนเริ่มต้น (นักเรียน)" htmlFor="a-class"><Select id="a-class" name="classId" defaultValue=""><option value="">— ไม่ระบุ —</option>{classes.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.term})</option>)}</Select></Field>
            </div>
          </ActionForm>
        </div>
      </Panel>
      {rows.length === 0 ? <EmptyState title="ยังไม่มีรายการ">ผู้ใช้จะเข้าสู่ระบบด้วย Google ไม่ได้จนกว่าจะเพิ่มอีเมลหรือโดเมน</EmptyState> : (
        <DataTable caption="รายการอีเมลที่อนุญาต">
          <thead><tr><Th>อีเมล/โดเมน</Th><Th>บทบาท</Th><Th>ห้องเรียน</Th><Th></Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="readout">{r.pattern}</Td>
                <Td>{roleLabel[r.role]}</Td>
                <Td>{r.className ? `${r.className} (${r.term})` : "–"}</Td>
                <Td>
                  <ActionForm action={removeAllowlistAction} submitLabel="ลบ" variant="ghost" size="sm" inline confirm={`ลบ ${r.pattern}? ผู้ใช้ใหม่จากรายการนี้จะเข้าสู่ระบบไม่ได้`}>
                    <input type="hidden" name="id" value={r.id} />
                  </ActionForm>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
