"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, FileText, PartyPopper, Printer, Upload } from "lucide-react";
import type { SubmissionInfo } from "@/server/contracts";
import { Alert, Badge, LinkButton } from "@/components/ui";
import { LabRunner, type TaskReporter } from "@/components/lab/LabRunner";
import { Markdown } from "../Markdown";
import { SafetyBadge, activityTypeText } from "../SafetyBadge";
import { usePlayer, union } from "./context";
import { toastRewards } from "./rewards";

export function SubmissionStatus({ sub, submit }: { sub?: SubmissionInfo; submit: boolean }) {
  if (!submit) return <span className="text-[0.92rem] text-ink-3">ไม่ต้องส่งไฟล์ ครูประเมินในชั้นเรียน</span>;
  if (!sub)
    return (
      <Badge tone="neutral">
        <Upload className="size-3.5" aria-hidden />
        ยังไม่ส่งงาน
      </Badge>
    );
  if (sub.status === "graded")
    return (
      <Badge tone="ok">
        ตรวจแล้ว{sub.score !== null ? ` ได้ ${sub.score}${sub.maxScore !== null ? `/${sub.maxScore}` : ""} คะแนน` : ""}
      </Badge>
    );
  if (sub.status === "returned") return <Badge tone="warn">ครูส่งกลับให้แก้ไข</Badge>;
  return <Badge tone="info">ส่งแล้ว รอครูตรวจ</Badge>;
}

export function LabStage() {
  const { slice, progress, setProgress, api, completeStage, stageHref, worksheetHref } = usePlayer();
  const lab = slice.lab;
  const [error, setError] = useState<string | null>(null);
  const done = progress.labTasksDone;
  const taskIds = slice.labTaskIds;
  const all = taskIds.length > 0 && taskIds.every((id) => done.includes(id));
  const stageDone = progress.stagesDone.includes("lab");
  const completing = useRef(false);

  const report: TaskReporter = useCallback(
    async (taskId, correct, value) => {
      const r = await api.recordLabTask(slice.week, taskId, correct, value);
      if (r.ok) {
        if (r.data.correct) setProgress((p) => ({ ...p, labTasksDone: union(p.labTasksDone, [taskId]) }));
        toastRewards(r.data);
      }
      return r;
    },
    [api, slice.week, setProgress],
  );

  useEffect(() => {
    if (!all || stageDone || completing.current) return;
    completing.current = true;
    void completeStage("lab").then((r) => {
      if (!r.ok) {
        setError(r.error);
        completing.current = false;
      }
    });
  }, [all, stageDone, completeStage]);

  if (!lab) return null;

  return (
    <div className="space-y-8">
      <LabRunner
        weekLab={lab}
        done={done}
        report={report}
        reflection={progress.labReflection}
        saveReflection={(answers) => api.saveLabReflection(slice.week, answers)}
        notes={progress.labNotes}
        saveNotes={(notes) => api.saveLabNotes(slice.week, notes)}
      />

      {error ? (
        <Alert tone="danger" title="บันทึกการผ่านขั้นนี้ไม่สำเร็จ">
          {error}
        </Alert>
      ) : null}
      {all || stageDone ? (
        <section className="rounded-md border-2 border-ok/50 bg-ok-soft/50 p-4" aria-live="polite">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <PartyPopper className="size-5 text-ok" aria-hidden />
            ทำภารกิจในห้องทดลองครบแล้ว
          </p>
          <p className="text-ink-2">ต่อไปทำแบบทดสอบท้ายสัปดาห์ ผ่านเกณฑ์ {slice.quizMeta.passPercent}% เพื่อปลดล็อกสัปดาห์ถัดไป</p>
          <LinkButton href={stageHref("quiz")} className="mt-3">
            ไปทำแบบทดสอบ
          </LinkButton>
        </section>
      ) : null}

      {slice.activities && slice.activities.length ? (
        <section aria-labelledby="acts-h">
          <h2 id="acts-h" className="text-[1.2rem] font-bold text-ink">
            ใบงานและกิจกรรมปฏิบัติจริง
          </h2>
          <p className="mb-3 max-w-[65ch] text-ink-2">ทำในโรงฝึกงานตามระดับความปลอดภัยที่กำหนด พิมพ์ใบงานไปบันทึกผล แล้วถ่ายรูปหรือสแกนส่งในหน้าใบงาน</p>
          <ul className="space-y-3">
            {slice.activities.map((a) => (
              <li key={a.id} className="rounded-md border border-line bg-panel p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.9rem] text-ink-3">
                      {activityTypeText[a.type]}
                      <span className="mx-2 inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden />
                        {a.minutes} นาที
                      </span>
                    </p>
                    <h3 className="text-[1.08rem] font-semibold text-ink">{a.title}</h3>
                  </div>
                  <SafetyBadge level={a.safety} />
                </div>
                <Markdown className="mt-2 text-ink-2 [&_p:last-child]:mb-0">{a.objective}</Markdown>
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                  <Link href={worksheetHref(a.id)} className="inline-flex items-center gap-1.5 font-semibold text-cobalt-ink underline-offset-4 hover:underline">
                    <FileText className="size-4" aria-hidden />
                    เปิดใบงาน
                    <Printer className="size-4" aria-hidden />
                    <span className="sr-only">(พิมพ์ได้)</span>
                  </Link>
                  <SubmissionStatus sub={progress.submissions[a.id]} submit={a.submit} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
