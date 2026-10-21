import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { Badge, EmptyState, LinkButton, PageHeader, Panel, PanelHeader, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/staff/ActionForm";
import { PageSkeleton, spGetter, type SP } from "@/components/staff/context";
import { fmtDateTime, plain, statusLabel } from "@/components/staff/format";
import { requireUser } from "@/server/auth";
import { submissionDetail } from "@/server/core/staff";
import { gradeSubmissionAction } from "@/server/actions/teacher";

export const metadata: Metadata = { title: "ตรวจใบงาน" };

type Params = Promise<{ id: string }>;

export default function GradePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const LEVELS = [4, 3, 2, 1] as const;
const LEVEL_NAME: Record<number, string> = { 4: "ดีมาก", 3: "ดี", 2: "พอใช้", 1: "ปรับปรุง" };

async function Body({ params, searchParams }: { params: Params; searchParams: SP }) {
  const me = await requireUser(["teacher", "admin"]);
  const { id } = await params;
  const one = spGetter(await searchParams);
  const back = `/teacher/submissions${one("class") ? `?class=${one("class")}` : ""}`;
  const d = await submissionDetail(db, { id: me.id, role: me.role }, id);
  if (!d) return <EmptyState title="ไม่พบงานนี้ หรือคุณไม่มีสิทธิ์ตรวจ" action={<Link className="text-cobalt hover:underline" href={back}>กลับไปรายการใบงาน</Link>} />;
  const x = d.submission;
  const act = d.activity;
  const fileUrl = x.fileKey ? `/api/files/${x.fileKey}` : null;
  const isImage = x.mimeType?.startsWith("image/") && x.mimeType !== "image/heic";
  return (
    <>
      <PageHeader
        kicker={<Link className="hover:underline" href={back}>← รายการใบงาน</Link>}
        title={act?.title ?? x.activityId}
        description={`${d.student?.name ?? ""}${d.student?.studentNo ? ` (${d.student.studentNo})` : ""} · สัปดาห์ที่ ${x.week} · ส่งเมื่อ ${fmtDateTime(x.submittedAt)}`}
        actions={<Badge tone={x.status === "graded" ? "ok" : x.status === "returned" ? "warn" : "info"}>{statusLabel[x.status]}</Badge>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="ไฟล์ที่ส่ง" description={x.fileName ?? undefined} action={fileUrl ? <LinkButton size="sm" variant="secondary" href={`${fileUrl}?download=1`} prefetch={false}>ดาวน์โหลด</LinkButton> : null} />
          <div className="p-4">
            {!fileUrl ? <p className="text-ink-3">ไม่มีไฟล์</p> : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt={`ใบงานที่ ${d.student?.name ?? "นักเรียน"} ส่ง`} className="max-h-[70vh] w-full rounded-sm border border-line object-contain" />
            ) : x.mimeType === "application/pdf" ? (
              <iframe src={fileUrl} title="ไฟล์ PDF ที่ส่ง" className="h-[70vh] w-full rounded-sm border border-line" />
            ) : (
              <p className="text-ink-2">ไฟล์ชนิดนี้แสดงตัวอย่างในเบราว์เซอร์ไม่ได้ กรุณากดดาวน์โหลด</p>
            )}
            {x.note ? <p className="mt-3 rounded-sm bg-panel-2 px-3 py-2 text-ink-2">หมายเหตุจากนักเรียน: {x.note}</p> : null}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="ให้คะแนนตามเกณฑ์" description={act ? `คะแนนเต็ม ${d.maxScore} · คะแนน = น้ำหนัก × ระดับ ÷ 4` : "ไม่พบเกณฑ์ของใบงานนี้ในเนื้อหา"} />
          <div className="p-4">
            {act ? (
              <ActionForm action={gradeSubmissionAction} submitLabel="บันทึกคะแนน" variant="ok">
                <input type="hidden" name="submissionId" value={x.id} />
                <input type="hidden" name="mode" value="grade" />
                {act.rubric.map((r, i) => (
                  <fieldset key={i} className="rounded-sm border border-line p-3">
                    <legend className="px-1 font-semibold text-ink">{r.criterion} <span className="font-normal text-ink-3">({r.weight} คะแนน)</span></legend>
                    <div className="mt-1 grid gap-1.5">
                      {LEVELS.map((lv, j) => (
                        <label key={lv} className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1 hover:bg-panel-2">
                          <input type="radio" name={`level-${i}`} value={lv} required defaultChecked={(x.rubricScores?.[i] ?? 0) === lv} className="mt-1.5" />
                          <span><span className="font-medium">{lv} {LEVEL_NAME[lv]}</span> <span className="text-ink-2">— {plain(r.levels[j], 240)}</span></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <label className="block space-y-1">
                  <span className="font-medium">คำแนะนำถึงนักเรียน</span>
                  <Textarea name="feedback" defaultValue={x.feedback ?? ""} maxLength={4000} placeholder="ชมจุดเด่น และบอกสิ่งที่ควรปรับปรุงอย่างเจาะจง" />
                </label>
              </ActionForm>
            ) : null}
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="font-semibold">ส่งกลับให้แก้ไข</h3>
              <p className="mb-2 text-[0.95rem] text-ink-3">นักเรียนจะเห็นคำแนะนำ และส่งไฟล์ใหม่ได้</p>
              <ActionForm action={gradeSubmissionAction} submitLabel="ส่งกลับให้แก้ไข" variant="secondary">
                <input type="hidden" name="submissionId" value={x.id} />
                <input type="hidden" name="mode" value="return" />
                <Textarea name="feedback" required maxLength={4000} aria-label="สิ่งที่ต้องแก้ไข" placeholder="บอกสิ่งที่ต้องแก้ไขก่อนส่งใหม่" />
              </ActionForm>
            </div>
            {act ? (
              <details className="mt-6">
                <summary className="cursor-pointer text-ink-2">ผลที่คาดหวังของใบงาน</summary>
                <p className="mt-2 whitespace-pre-line text-ink-2">{plain(act.expected, 2000)}</p>
              </details>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
