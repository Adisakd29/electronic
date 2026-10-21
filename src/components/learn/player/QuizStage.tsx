"use client";
import { useState } from "react";
import { ClipboardCheck, LogIn } from "lucide-react";
import { Alert, LinkButton, Stat } from "@/components/ui";
import { usePlayer } from "./context";
import { QuizRunner } from "./Quiz";
import { GUEST_QUIZ_MESSAGE } from "../guest";

export function QuizStage() {
  const { isGuest } = usePlayer();
  return isGuest ? <GuestQuizNotice /> : <MemberQuiz />;
}

function GuestQuizNotice() {
  const { slice, stageHref, basePath } = usePlayer();
  return (
    <section aria-labelledby="quiz-h" className="rounded-md border border-line bg-panel p-5">
      <h2 id="quiz-h" className="flex items-center gap-2 text-[1.3rem] font-bold text-ink">
        <ClipboardCheck className="size-6 text-cobalt" aria-hidden />
        แบบทดสอบท้ายสัปดาห์
      </h2>
      <p className="mt-2 max-w-[65ch] text-ink-2">{GUEST_QUIZ_MESSAGE}</p>
      <p className="mt-2 max-w-[65ch] text-ink-2">
        ผู้เยี่ยมชมทบทวนความเข้าใจได้จากกิจกรรมในขั้นฝึกปฏิบัติและภารกิจท้าทายในขั้นสรุป ({slice.quizMeta.drawCount} ข้อในแบบทดสอบจริงสุ่มจากคลังข้อสอบของสัปดาห์นี้)
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LinkButton href={`/login?next=${encodeURIComponent(`${basePath}/quiz`)}`}>
          <LogIn className="size-4" aria-hidden />
          เข้าสู่ระบบเพื่อทำแบบทดสอบ
        </LinkButton>
        <LinkButton href={stageHref("complete")} variant="secondary">
          ไปสรุปและจบบท
        </LinkButton>
      </div>
    </section>
  );
}

function MemberQuiz() {
  const { slice, progress, setProgress, api, completeStage, stageHref, nextWeek } = usePlayer();
  const q = progress.quiz;
  const [error, setError] = useState<string | null>(null);
  const [passedNow, setPassedNow] = useState(false);
  const passed = q.passed || passedNow;
  const pass = q.passPercent || slice.quizMeta.passPercent;

  return (
    <div className="space-y-6">
      <section aria-labelledby="quiz-h" className="rounded-md border border-line bg-panel p-5">
        <h2 id="quiz-h" className="flex items-center gap-2 text-[1.3rem] font-bold text-ink">
          <ClipboardCheck className="size-6 text-cobalt" aria-hidden />
          แบบทดสอบท้ายสัปดาห์
        </h2>
        <p className="mt-1 max-w-[65ch] text-ink-2">
          สุ่ม {slice.quizMeta.drawCount} ข้อจากคลังข้อสอบ ผ่านเมื่อได้อย่างน้อย {pass}% ทำซ้ำได้ ทุกครั้งจะได้ชุดข้อใหม่ และระบบเก็บคะแนนที่ดีที่สุด
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="ทำไปแล้ว" value={`${q.attempts} ครั้ง`} />
          <Stat label="คะแนนสูงสุด" value={q.bestPercent === null ? "—" : `${Math.round(q.bestPercent)}%`} />
          <Stat label="สถานะ" value={passed ? "ผ่านแล้ว" : "ยังไม่ผ่าน"} />
        </div>
      </section>

      {error ? (
        <Alert tone="danger" title="บันทึกการผ่านขั้นนี้ไม่สำเร็จ">
          {error}
        </Alert>
      ) : null}

      <QuizRunner
        api={api}
        week={slice.week}
        kind="post"
        startLabel={q.openAttemptId ? "ทำต่อจากที่ค้างไว้" : q.attempts > 0 ? "ทำแบบทดสอบอีกครั้ง" : "เริ่มทำแบบทดสอบ"}
        nextWeek={nextWeek}
        onResult={async (r) => {
          setProgress((p) => ({
            ...p,
            quiz: {
              ...p.quiz,
              attempts: p.quiz.attempts + 1,
              bestPercent: Math.max(p.quiz.bestPercent ?? 0, r.percent),
              passed: p.quiz.passed || r.passed,
              openAttemptId: null,
            },
          }));
          if (r.passed) {
            setPassedNow(true);
            if (!progress.stagesDone.includes("quiz")) {
              const c = await completeStage("quiz");
              if (!c.ok) setError(c.error);
            }
          }
        }}
      />

      {passed ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <LinkButton href={stageHref("complete")}>ไปสรุปและจบบท</LinkButton>
        </div>
      ) : null}
    </div>
  );
}
