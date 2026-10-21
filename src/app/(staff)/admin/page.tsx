import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { googleEnabled } from "@/lib/env";
import { Alert, Badge, DataTable, PageHeader, Panel, PanelHeader, Stat, Td, Th } from "@/components/ui";
import { PageSkeleton } from "@/components/staff/context";
import { requireUser } from "@/server/auth";
import { systemInfo } from "@/server/core/admin";

export const metadata: Metadata = { title: "ข้อมูลระบบ" };

export default function AdminHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireUser(["admin"]);
  const s = await systemInfo(db);
  const stubs = s.weeks.filter((w) => w.stub);
  const unseeded = s.weeks.filter((w) => !w.stub && w.contentQuestions > 0 && w.bankActive === 0);
  return (
    <>
      <PageHeader title="ข้อมูลระบบ" description="จำนวนข้อมูล และสถานะเนื้อหารายสัปดาห์" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="นักเรียน" value={s.counts.students} />
        <Stat label="ครู / ผู้ดูแล" value={`${s.counts.teachers} / ${s.counts.admins}`} />
        <Stat label="ห้องเรียนที่ใช้งาน" value={s.counts.classes} />
        <Stat label="ข้อสอบที่ใช้งาน" value={s.counts.questions} />
        <Stat label="การทำแบบทดสอบ" value={s.counts.attempts} />
        <Stat label="ใบงานที่ส่ง" value={s.counts.submissions} />
        <Stat label="เกียรติบัตร" value={s.counts.certificates} />
        <Stat label="Google sign-in" value={googleEnabled() ? "เปิดใช้" : "ปิด"} hint={googleEnabled() ? undefined : "ตั้ง GOOGLE_CLIENT_ID/SECRET เพื่อเปิด"} />
      </div>
      <div className="mt-6 space-y-3">
        {stubs.length ? <Alert tone="warn" title={`เนื้อหายังไม่สมบูรณ์ ${stubs.length} สัปดาห์`}>สัปดาห์ที่ {stubs.map((w) => w.week).join(", ")} ยังเป็นเนื้อหาชั่วคราว (ไม่มีหัวข้อเรียน)</Alert> : <Alert tone="ok">เนื้อหาครบทั้ง 18 สัปดาห์</Alert>}
        {unseeded.length ? <Alert tone="warn" title="คลังข้อสอบยังไม่ได้นำเข้า">สัปดาห์ที่ {unseeded.map((w) => w.week).join(", ")} มีข้อสอบในเนื้อหาแต่ยังไม่อยู่ในฐานข้อมูล — รัน <code>npm run db:seed</code></Alert> : null}
      </div>
      <Panel className="mt-6">
        <PanelHeader title="ตรวจสอบเนื้อหารายสัปดาห์" />
        <div className="p-4">
          <DataTable caption="สถานะเนื้อหารายสัปดาห์">
            <thead><tr><Th>สัปดาห์</Th><Th>ชื่อ</Th><Th>สถานะ</Th><Th>หัวข้อ</Th><Th>กิจกรรม</Th><Th>ภารกิจแล็บ</Th><Th>ข้อสอบ (เนื้อหา/ใช้งาน)</Th></tr></thead>
            <tbody>
              {s.weeks.map((w) => (
                <tr key={w.week}>
                  <Td>{w.week}</Td>
                  <Td>{w.title}</Td>
                  <Td>{!w.loaded ? <Badge tone="danger">โหลดไม่ได้</Badge> : w.stub ? <Badge tone="warn">ชั่วคราว</Badge> : <Badge tone="ok">พร้อม</Badge>}</Td>
                  <Td>{w.steps}</Td><Td>{w.interactions}</Td><Td>{w.labTasks}</Td>
                  <Td className={w.contentQuestions !== w.bankActive ? "text-warn" : ""}>{w.contentQuestions} / {w.bankActive}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </Panel>
    </>
  );
}
