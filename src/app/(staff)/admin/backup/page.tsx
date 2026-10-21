import type { Metadata } from "next";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { LinkButton, PageHeader, Panel, PanelHeader } from "@/components/ui";
import { PageSkeleton } from "@/components/staff/context";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "สำรองข้อมูล" };

export default function BackupPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireUser(["admin"]);
  return (
    <>
      <PageHeader title="สำรองข้อมูล" description="ดาวน์โหลดข้อมูลการเรียนทั้งหมด และวิธีกู้คืน" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="ส่งออกข้อมูลรายวิชา (JSON)" description="ผู้ใช้ ห้องเรียน ความก้าวหน้า ผลสอบ คลังข้อสอบ ใบงาน สมรรถนะ XP และเกียรติบัตร — ไม่รวมรหัสผ่านและโทเค็นเข้าสู่ระบบ" />
          <div className="p-4">
            <LinkButton href="/api/export/backup" prefetch={false}><Download size={18} aria-hidden /> ดาวน์โหลดไฟล์สำรอง (.json)</LinkButton>
            <p className="mt-3 text-[0.95rem] text-ink-3">ไฟล์มีข้อมูลส่วนบุคคลของนักเรียน เก็บในที่ปลอดภัยและลบเมื่อไม่ใช้</p>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="สำรองฐานข้อมูลทั้งระบบ (แนะนำ)" />
          <div className="space-y-3 p-4 text-ink-2">
            <p>ใช้สคริปต์ที่เรียก <code>pg_dump</code> ได้ไฟล์ที่กู้คืนได้ทั้งหมด (รวมบัญชีและรหัสผ่านที่เข้ารหัส):</p>
            <pre className="readout overflow-x-auto rounded-sm bg-panel-2 p-3 text-[0.9rem]">npx tsx scripts/backup.ts ./backups</pre>
            <p>กู้คืน:</p>
            <pre className="readout overflow-x-auto rounded-sm bg-panel-2 p-3 text-[0.9rem]">pg_restore --clean --if-exists --no-owner -d &quot;$DATABASE_URL&quot; backups/eelearn-&lt;วันที่&gt;.dump</pre>
            <p>ไฟล์ใบงานที่นักเรียนอัปโหลดเก็บแยกในโฟลเดอร์ <code>UPLOAD_DIR</code> (บน Railway คือ Volume) — สำรองโฟลเดอร์นี้ด้วย</p>
            <p>หลังกู้คืน ให้รัน <code>npm run db:migrate</code> เพื่อให้โครงสร้างตารางเป็นเวอร์ชันล่าสุด</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
