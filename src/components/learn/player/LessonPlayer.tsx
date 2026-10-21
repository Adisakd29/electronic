"use client";
/**
 * Client root of a week stage: keeps the learner's progress, records results
 * through the (swappable) learner API and renders the stage.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, NotebookPen, UserRound } from "lucide-react";
import { categoryInfo, stages, type StageKey } from "@/content/course";
import type { WeekProgress } from "@/server/contracts";
import { Alert, LinkButton, ProgressBar } from "@/components/ui";
import { Disclosure } from "@/components/ui/client";
import { Markdown } from "../Markdown";
import { useLearnApi } from "../api";
import { LessonEnvProvider, type LessonEnv } from "../lesson-context";
import { TrackPicker, TrackProvider } from "../track";
import type { TrackInfo } from "@/server/core/track";
import type { WeekSlice } from "../slice";
import { PlayerContext, union, type NextWeekInfo, type PlayerCtx } from "./context";
import { toastError, toastInfo, toastRewards } from "./rewards";
import { Stepper } from "./Stepper";
import { IntroStage } from "./IntroStage";
import { LearnStage } from "./LearnStage";
import { PracticeStage } from "./PracticeStage";
import { LabStage } from "./LabStage";
import { QuizStage } from "./QuizStage";
import { CompleteStage } from "./CompleteStage";

function mergeProgress(local: WeekProgress, server: WeekProgress): WeekProgress {
  return {
    ...server,
    stagesDone: union(local.week === server.week ? local.stagesDone : [], server.stagesDone),
    stepsDone: union(local.week === server.week ? local.stepsDone : [], server.stepsDone),
    interactionsCorrect: union(local.week === server.week ? local.interactionsCorrect : [], server.interactionsCorrect),
    labTasksDone: union(local.week === server.week ? local.labTasksDone : [], server.labTasksDone),
  };
}

export function LessonPlayer({
  slice,
  stage,
  progress: initialProgress,
  isStaff,
  isGuest = false,
  track = null,
  basePath,
  teacherNotes,
  nextWeek,
  worksheetBase,
}: {
  slice: WeekSlice;
  stage: StageKey;
  progress: WeekProgress;
  isStaff: boolean;
  /** Visitor without an account (progress in this browser only, see ../guest.ts). */
  isGuest?: boolean;
  /** Learner trade for "ในงานแผนกของคุณ" examples (signed-in); guests keep theirs in the browser. */
  track?: TrackInfo | null;
  basePath: string;
  teacherNotes?: string[];
  nextWeek: NextWeekInfo | null;
  /** Defaults to `${basePath}/worksheet`. */
  worksheetBase?: string;
}) {
  const api = useLearnApi();
  const router = useRouter();
  const [progress, setProgressState] = useState(initialProgress);
  const [seen, setSeen] = useState(initialProgress);
  if (initialProgress !== seen) {
    // fresh server data after navigation/refresh: merge, keep local gains
    setSeen(initialProgress);
    setProgressState(mergeProgress(progress, initialProgress));
  }
  const setProgress = useCallback((fn: (p: WeekProgress) => WeekProgress) => setProgressState(fn), []);
  const week = slice.week;

  // ---- position autosave for non-learn stages (learn saves per step)
  useEffect(() => {
    if (stage === "learn") return;
    const t = setTimeout(() => void api.savePosition(week, stage, 0), 800);
    return () => clearTimeout(t);
  }, [api, week, stage]);

  const completeStage = useCallback(
    async (s: StageKey) => {
      const r = await api.completeStage(week, s);
      if (r.ok) {
        setProgressState((p) => ({ ...p, stagesDone: union(p.stagesDone, isStaff ? [...r.data.stagesDone, s] : r.data.stagesDone) }));
        toastRewards(r.data);
        if (r.data.nextWeekUnlocked && nextWeek) toastInfo(`ปลดล็อกสัปดาห์ที่ ${nextWeek.week} แล้ว`);
        router.refresh();
      }
      return r;
    },
    [api, week, isStaff, router, nextWeek],
  );

  const pending = useRef(new Set<string>());
  const onInteraction = useCallback(
    async (id: string, correct: boolean, answerKey?: string) => {
      const k = `${id}:${correct}:${answerKey ?? ""}`;
      if (pending.current.has(k)) return;
      pending.current.add(k);
      const r = await api.recordInteraction(week, id, correct, answerKey);
      pending.current.delete(k);
      if (correct) setProgressState((p) => ({ ...p, interactionsCorrect: union(p.interactionsCorrect, [id]) }));
      if (r.ok) toastRewards(r.data);
      else toastError(r.error);
    },
    [api, week],
  );

  const correctSet = useMemo(() => new Set(progress.interactionsCorrect), [progress.interactionsCorrect]);
  const env: LessonEnv = useMemo(
    () => ({ week, isStaff, basePath, correct: correctSet, onInteraction }),
    [week, isStaff, basePath, correctSet, onInteraction],
  );
  const ctx: PlayerCtx = useMemo(
    () => ({
      slice,
      stage,
      progress,
      setProgress,
      api,
      basePath,
      isStaff,
      isGuest,
      stageHref: (s: StageKey) => `${basePath}/${s}`,
      completeStage,
      nextWeek,
      worksheetHref: (id: string) => `${worksheetBase ?? `${basePath}/worksheet`}/${encodeURIComponent(id)}`,
    }),
    [slice, stage, progress, setProgress, api, basePath, isStaff, isGuest, completeStage, nextWeek, worksheetBase],
  );

  const color = `var(${categoryInfo[slice.category].cssVar})`;
  const pct = Math.round((progress.stagesDone.length / stages.length) * 100);

  return (
    <TrackProvider initial={track} guest={isGuest}>
    <PlayerContext value={ctx}>
      <LessonEnvProvider value={env}>
        <div className="mb-5 rounded-md border border-line bg-panel px-3 pb-2 pt-3 shadow-1 sm:px-4">
          <Stepper basePath={basePath} current={stage} done={progress.stagesDone} open={isStaff ? undefined : progress.stagesOpen} color={color} />
          <div className="mt-2 flex items-center gap-3 px-1 print:hidden">
            <ProgressBar value={pct} label={`ความก้าวหน้าสัปดาห์ที่ ${week}`} color={color} className="flex-1" />
            <span className="readout shrink-0 text-[0.88rem] text-ink-3">{pct}%</span>
          </div>
          <TrackPicker compact className="mt-2 border-t border-line px-1 pt-2 print:hidden" />
        </div>
        {isGuest ? (
          <div className="mb-5 print:hidden">
            <Alert tone="info" title={<span className="inline-flex items-center gap-2"><UserRound className="size-4" aria-hidden />กำลังเรียนแบบผู้เยี่ยมชม (ไม่ได้เข้าสู่ระบบ)</span>}>
              <p>ความก้าวหน้าบันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ครูจะไม่เห็นผลการเรียน ไม่มีแบบทดสอบ คะแนน XP และการส่งใบงาน ถ้าเป็นนักเรียนในชั้นเรียน ให้เข้าสู่ระบบก่อนเรียน</p>
              <LinkButton href={`/login?next=${encodeURIComponent(`${basePath}/${stage}`)}`} size="sm" variant="secondary" className="mt-3">
                เข้าสู่ระบบเพื่อบันทึกผลการเรียน
              </LinkButton>
            </Alert>
          </div>
        ) : null}
        {isStaff ? (
          <div className="mb-5 space-y-3 print:hidden">
            <Alert tone="signal" title={<span className="inline-flex items-center gap-2"><Eye className="size-4" aria-hidden />โหมดดูตัวอย่างสำหรับครู</span>}>
              ทุกขั้นเปิดให้ดูได้ คำตอบและการกดปุ่มในโหมดนี้จะไม่บันทึกเป็นความก้าวหน้าของนักเรียน
            </Alert>
            {teacherNotes && teacherNotes.length ? (
              <div className="rounded-md border border-line bg-panel">
                <Disclosure summary="บันทึกสำหรับครู (นักเรียนไม่เห็นส่วนนี้)" icon={<NotebookPen className="size-5 text-copper" aria-hidden />}>
                  <ul className="list-disc space-y-2 px-5 pb-4 pl-10 text-ink-2">
                    {teacherNotes.map((n, i) => (
                      <li key={i}>
                        <Markdown inline>{n}</Markdown>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              </div>
            ) : null}
          </div>
        ) : null}
        <div id="stage-content">
          {stage === "intro" ? <IntroStage /> : null}
          {stage === "learn" ? <LearnStage /> : null}
          {stage === "practice" ? <PracticeStage /> : null}
          {stage === "lab" ? <LabStage /> : null}
          {stage === "quiz" ? <QuizStage /> : null}
          {stage === "complete" ? <CompleteStage /> : null}
        </div>
      </LessonEnvProvider>
    </PlayerContext>
    </TrackProvider>
  );
}
