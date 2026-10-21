import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { DataTable, EmptyState, PageHeader, Td, Th } from "@/components/ui";
import { PageSkeleton } from "@/components/staff/context";
import { fmtDateTime } from "@/components/staff/format";
import { requireUser } from "@/server/auth";
import { auditRecent } from "@/server/core/admin";

export const metadata: Metadata = { title: "บันทึกการใช้งาน" };

const ACTION: Record<string, string> = {
  "unlock.override.grant": "ปลดล็อกรายบุคคล",
  "unlock.override.revoke": "ยกเลิกปลดล็อกรายบุคคล",
  "unlock.policy.save": "บันทึกเกณฑ์ปลดล็อก",
  "unlock.week.open": "เปิดสัปดาห์ให้ทั้งห้อง",
  "unlock.week.close": "ยกเลิกเปิดสัปดาห์",
  "user.password.reset": "รีเซ็ตรหัสผ่าน",
  "user.create": "สร้างบัญชี",
  "user.role": "เปลี่ยนบทบาท",
  "user.disable": "ปิดใช้งานบัญชี",
  "user.enable": "เปิดใช้งานบัญชี",
  "certificate.issue": "ออกเกียรติบัตร",
  "certificate.revoke": "ยกเลิกเกียรติบัตร",
  "submission.grade": "ให้คะแนนใบงาน",
  "submission.return": "ส่งใบงานกลับแก้ไข",
  "submission.delete": "ลบใบงาน",
  "competency.save": "บันทึกผลประเมินสมรรถนะ",
  "question.edit": "แก้ไขข้อสอบ",
  "question.create": "เพิ่มข้อสอบ",
  "class.bulk-create": "สร้างบัญชีนักเรียนหลายคน",
  "class.create": "สร้างห้องเรียน",
  "class.archive": "เก็บห้องเรียนเข้าคลัง",
  "class.unarchive": "นำห้องเรียนกลับมาใช้",
  "class.teacher.add": "เพิ่มครูประจำห้อง",
  "class.teacher.remove": "นำครูออกจากห้อง",
  "class.enrol": "เพิ่มนักเรียนเข้าห้อง",
  "class.unenrol": "นำนักเรียนออกจากห้อง",
  "allowlist.add": "เพิ่มอีเมล Google",
  "allowlist.remove": "ลบอีเมล Google",
  "backup.export": "ดาวน์โหลดไฟล์สำรอง",
};

export default function AuditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireUser(["admin"]);
  const rows = await auditRecent(db, 200);
  return (
    <>
      <PageHeader title="บันทึกการใช้งาน" description="200 รายการล่าสุดที่ครูและผู้ดูแลเปลี่ยนข้อมูลของผู้อื่น" />
      {rows.length === 0 ? <EmptyState title="ยังไม่มีบันทึก" /> : (
        <DataTable caption="บันทึกการใช้งาน">
          <thead><tr><Th>เวลา</Th><Th>ผู้ทำ</Th><Th>รายการ</Th><Th>เป้าหมาย</Th><Th>รายละเอียด</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</Td>
                <Td>{r.actor ?? "–"}<div className="readout text-[0.85rem] text-ink-3">{r.actorUsername ?? ""}</div></Td>
                <Td>{ACTION[r.action] ?? r.action}</Td>
                <Td className="readout max-w-48 truncate" title={r.target ?? ""}>{r.target ?? "–"}</Td>
                <Td className="readout max-w-64 truncate text-[0.85rem]" title={r.detail ? JSON.stringify(r.detail) : ""}>{r.detail ? JSON.stringify(r.detail) : "–"}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
