"use client";
/**
 * Worksheet upload (screen only): sends the photo/PDF of a finished worksheet
 * through `submitAssignment` and shows the current submission status.
 */
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, MessageSquareText } from "lucide-react";
import type { SubmissionInfo } from "@/server/contracts";
import { Alert, Badge, Button, Field, Textarea } from "@/components/ui";
import { useLearnApi } from "../api";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.docx";
const EXT_OK = /\.(pdf|jpe?g|png|webp|heic|docx)$/i;

const dateFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

function StatusBadge({ sub }: { sub: SubmissionInfo | null }) {
  if (!sub) return <Badge tone="neutral">ยังไม่ส่งงาน</Badge>;
  if (sub.status === "graded") return <Badge tone="ok">ตรวจแล้ว</Badge>;
  if (sub.status === "returned") return <Badge tone="warn">ครูส่งกลับให้แก้ไข</Badge>;
  return <Badge tone="info">ส่งแล้ว รอครูตรวจ</Badge>;
}

export function WorksheetUpload({
  week,
  activityId,
  criteria,
  initial,
}: {
  week: number;
  activityId: string;
  /** Rubric criterion names, to label per-criterion levels from the teacher. */
  criteria: string[];
  initial: SubmissionInfo | null;
}) {
  const api = useLearnApi();
  const router = useRouter();
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [sub, setSub] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    // fresh server data after router.refresh()
    setSeen(initial);
    setSub(initial);
  }
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locked = sub?.status === "graded";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("ยังไม่ได้เลือกไฟล์ กดปุ่มเลือกไฟล์ใบงานก่อน แล้วกดส่งอีกครั้ง");
      return;
    }
    if (!EXT_OK.test(file.name)) {
      setError("ไฟล์ชนิดนี้ส่งไม่ได้ ส่งได้เฉพาะ PDF, JPG, PNG, WEBP, HEIC หรือ DOCX");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("ไฟล์มีขนาดเกิน 10 MB ลดขนาดรูปหรือบันทึกเป็น PDF แล้วส่งใหม่");
      return;
    }
    fd.set("week", String(week));
    fd.set("activityId", activityId);
    startTransition(async () => {
      const r = await api.submitAssignment(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSub((p) => ({
        activityId,
        status: "submitted",
        fileName: file.name,
        submittedAt: new Date().toISOString(),
        score: null,
        maxScore: p?.maxScore ?? null,
        rubricScores: null,
        feedback: null,
      }));
      setSuccess("ส่งใบงานเรียบร้อยแล้ว ครูจะตรวจและแจ้งผลในหน้านี้");
      setChosen(null);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div className="rounded-md border border-line bg-panel-2/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-ink">สถานะงาน</span>
          <StatusBadge sub={sub} />
        </div>
        {sub ? (
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[0.95rem] sm:grid-cols-[auto_minmax(0,1fr)]">
            {sub.fileName ? (
              <>
                <dt className="text-ink-3">ไฟล์ที่ส่ง</dt>
                <dd className="min-w-0 break-all text-ink">{sub.fileName}</dd>
              </>
            ) : null}
            <dt className="text-ink-3">ส่งเมื่อ</dt>
            <dd className="text-ink">{dateFmt.format(new Date(sub.submittedAt))}</dd>
            {sub.score !== null ? (
              <>
                <dt className="text-ink-3">คะแนน</dt>
                <dd className="readout font-semibold text-ink">
                  {sub.score}
                  {sub.maxScore !== null ? ` / ${sub.maxScore}` : ""}
                </dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-ink-2">ยังไม่มีไฟล์ที่ส่ง ทำใบงานให้เสร็จ ถ่ายรูปหรือสแกนให้อ่านออกชัดเจน แล้วส่งด้านล่าง</p>
        )}
        {sub?.rubricScores && sub.rubricScores.length ? (
          <ul className="mt-3 space-y-1 text-[0.95rem]" aria-label="ระดับที่ได้ในแต่ละหัวข้อ">
            {sub.rubricScores.map((lv, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-t border-line pt-1">
                <span className="text-ink-2">{criteria[i] ?? `หัวข้อที่ ${i + 1}`}</span>
                <span className="readout text-ink">ระดับ {lv} จาก 4</span>
              </li>
            ))}
          </ul>
        ) : null}
        {sub?.feedback ? (
          <div className="mt-3 rounded-sm border border-line bg-panel p-3">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <MessageSquareText className="size-4" aria-hidden />
              ความเห็นจากครู
            </p>
            <p className="mt-1 whitespace-pre-line text-ink-2">{sub.feedback}</p>
          </div>
        ) : null}
      </div>

      <div aria-live="polite" className="space-y-2">
        {success ? (
          <Alert tone="ok" title={<span className="inline-flex items-center gap-2"><CheckCircle2 className="size-5" aria-hidden />ส่งงานแล้ว</span>}>
            {success}
          </Alert>
        ) : null}
        {error ? (
          <Alert tone="danger" title="ส่งงานไม่สำเร็จ">
            {error}
          </Alert>
        ) : null}
      </div>

      {locked ? (
        <p className="text-ink-2">ครูให้คะแนนใบงานนี้แล้ว ถ้าต้องการส่งใหม่ให้ติดต่อครูผู้สอน</p>
      ) : (
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4" encType="multipart/form-data" noValidate>
          {sub?.status === "returned" ? <p className="text-ink-2">อ่านความเห็นจากครู แก้ไขใบงาน แล้วส่งไฟล์ใหม่</p> : null}
          {sub?.status === "submitted" ? <p className="text-ink-2">ส่งไฟล์ใหม่ได้จนกว่าครูจะให้คะแนน ไฟล์ใหม่จะแทนที่ไฟล์เดิม</p> : null}
          <Field
            label="ไฟล์ใบงาน"
            htmlFor={`${uid}-file`}
            hint="PDF, JPG, PNG, WEBP, HEIC หรือ DOCX ขนาดไม่เกิน 10 MB"
          >
            <input
              id={`${uid}-file`}
              name="file"
              type="file"
              accept={ACCEPT}
              required
              disabled={pending}
              onChange={(e) => setChosen(e.currentTarget.files?.[0]?.name ?? null)}
              className="block w-full rounded-sm border border-line-strong bg-panel px-3 py-2 text-ink file:mr-3 file:rounded-sm file:border-0 file:bg-cobalt-soft file:px-3 file:py-1.5 file:font-semibold file:text-cobalt-ink focus-visible:border-cobalt"
            />
          </Field>
          {chosen ? <p className="text-[0.92rem] text-ink-3">เลือกไฟล์: <span className="break-all text-ink-2">{chosen}</span></p> : null}
          <Field label="ข้อความถึงครู (ไม่บังคับ)" htmlFor={`${uid}-note`}>
            <Textarea id={`${uid}-note`} name="note" rows={3} maxLength={2000} disabled={pending} />
          </Field>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            <FileUp className="size-5" aria-hidden />
            {pending ? "กำลังส่งไฟล์…" : sub ? "ส่งไฟล์ใหม่" : "ส่งใบงาน"}
          </Button>
        </form>
      )}
    </div>
  );
}
