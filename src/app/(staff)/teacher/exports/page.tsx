import type { Metadata } from "next";
import { Suspense } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { LinkButton, PageHeader, Panel, PanelHeader } from "@/components/ui";
import { ClassBar, NoClass, PageSkeleton, teacherPage, type SP } from "@/components/staff/context";

export const metadata: Metadata = { title: "ส่งออกรายงาน" };

export default function ExportsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: SP }) {
  const { me, classes, current } = await teacherPage(searchParams);
  if (!current) return (<><PageHeader title="ส่งออกรายงาน" /><NoClass isAdmin={me.role === "admin"} /></>);
  const c = current.id;
  return (
    <>
      <PageHeader title="ส่งออกรายงาน" description="ดาวน์โหลดผลการเรียนของห้องเพื่อนำไปใช้ใน Excel หรือระบบทะเบียน ไฟล์ CSV มี BOM จึงเปิดภาษาไทยใน Excel ได้ถูกต้อง" />
      <ClassBar classes={classes} current={current} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="สมุดคะแนน (Gradebook)" description="เลขประจำตัว ชื่อ ความก้าวหน้า การจบแต่ละสัปดาห์ คะแนนก่อน/หลังเรียน ห้องทดลอง คะแนนใบงาน ผลประเมินสมรรถนะ และ XP" />
          <div className="p-4"><Btns path="/api/export/gradebook" classId={c} /></div>
        </Panel>
        <Panel>
          <PanelHeader title="วิเคราะห์ข้อสอบรายข้อ" description="% ตอบถูกของข้อสอบ และ % ตอบผิดของกิจกรรมในบทเรียน ทุกสัปดาห์" />
          <div className="p-4"><Btns path="/api/export/items" classId={c} /></div>
        </Panel>
      </div>
    </>
  );
}

function Btns({ path, classId }: { path: string; classId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <LinkButton href={`${path}?class=${classId}&format=xlsx`} prefetch={false}><FileSpreadsheet size={18} aria-hidden /> Excel (.xlsx)</LinkButton>
      <LinkButton href={`${path}?class=${classId}&format=csv`} variant="secondary" prefetch={false}><FileText size={18} aria-hidden /> CSV (UTF-8)</LinkButton>
    </div>
  );
}
