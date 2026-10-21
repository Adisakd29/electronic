"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, ClipboardList, HeartHandshake, LoaderCircle, Wrench } from "lucide-react";
import type { Objective } from "@/content/types";
import { Alert, Button } from "@/components/ui";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { FigureNumbersProvider } from "../lesson-context";
import { interactionFigures, numberFigures } from "../lib/figures";
import { InteractionView } from "../interactions/InteractionView";
import { usePlayer } from "./context";
import { QuizRunner } from "./Quiz";
import { WeekCriteriaBox } from "./CompleteStage";
import { TrackNotes } from "../track";

function ObjectiveGroup({ title, icon, items }: { title: string; icon: React.ReactNode; items: Objective[] }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className="mb-2 flex items-center gap-2 font-semibold text-ink">
        {icon}
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((o) => (
          <li key={o.id} className="flex gap-2 text-ink-2">
            <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-copper" />
            <span>{o.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const skipKey = (w: number) => `ee:pretest-skipped:${w}`;

function readSkip(w: number) {
  try {
    return localStorage.getItem(skipKey(w)) === "1";
  } catch {
    return false;
  }
}

export function IntroStage() {
  const { slice, progress, setProgress, completeStage, stageHref, api, isStaff, isGuest } = usePlayer();
  const router = useRouter();
  const intro = slice.intro;
  const obj = slice.objectives;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<boolean | null>(null);
  // Decided once per visit: after submitting, the runner stays mounted to show the result review.
  const [pretestDone] = useState(progress.pretest !== null);

  useEffect(() => {
    const t = setTimeout(() => setSkipped(readSkip(slice.week)), 0);
    return () => clearTimeout(t);
  }, [slice.week]);

  const warmups = useMemo(() => (intro?.warmup ?? []).map((id) => slice.interactions[id]).filter(Boolean), [intro, slice.interactions]);
  const numbers = useMemo(() => {
    const keys = [...(intro?.figure ? [intro.figure.figure] : []), ...warmups.flatMap((w) => interactionFigures(w).map((f) => f.figure))];
    return numberFigures(keys);
  }, [intro, warmups]);

  const start = async () => {
    setBusy(true);
    setError(null);
    const r = await completeStage("intro");
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(stageHref("learn"));
  };

  if (!intro || !obj) return null;
  const showPretest = !pretestDone && skipped === false && !isStaff && !isGuest && slice.quizMeta.bankSize > 0;

  return (
    <FigureNumbersProvider value={numbers}>
      <div className="space-y-8">
        <section aria-labelledby="obj-h" className="rounded-md border border-line bg-panel p-5">
          <h2 id="obj-h" className="mb-4 text-[1.2rem] font-bold text-ink">
            จุดประสงค์การเรียนรู้
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <ObjectiveGroup title="ด้านความรู้" icon={<BookOpen className="size-5 text-cobalt" aria-hidden />} items={obj.knowledge} />
            <ObjectiveGroup title="ด้านทักษะ" icon={<Wrench className="size-5 text-copper" aria-hidden />} items={obj.skill} />
            <ObjectiveGroup title="ด้านคุณลักษณะที่พึงประสงค์" icon={<HeartHandshake className="size-5 text-ok" aria-hidden />} items={obj.attitude} />
          </div>
          {slice.competency ? (
            <p className="mt-5 border-t border-line pt-3 text-ink-2">
              <span className="font-semibold text-ink">สมรรถนะประจำหน่วย: </span>
              {slice.competency}
            </p>
          ) : null}
        </section>

        <WeekCriteriaBox compact criteria={slice.criteria} week={slice.week} />

        <section aria-labelledby="hook-h">
          <h2 id="hook-h" className="sr-only">
            บทนำ
          </h2>
          <Markdown className="text-[1.08rem] text-ink">{intro.hook}</Markdown>
          {intro.figure ? <FigureView fig={intro.figure} /> : null}
          {intro.scenario ? (
            <div className="my-5 max-w-[72ch] rounded-md border-l-4 border-copper bg-copper-soft/50 px-4 py-3">
              <p className="mb-1 font-semibold text-ink">สถานการณ์</p>
              <Markdown className="text-ink-2 [&_p:last-child]:mb-0">{intro.scenario}</Markdown>
            </div>
          ) : null}
        </section>

        {intro.whyItMatters.length ? (
          <section aria-labelledby="why-h" className="max-w-[72ch]">
            <h2 id="why-h" className="mb-2 text-[1.15rem] font-semibold text-ink">
              ทำไมเรื่องนี้สำคัญ
            </h2>
            <ul className="space-y-2">
              {intro.whyItMatters.map((w, i) => (
                <li key={i} className="flex gap-2 text-ink-2">
                  <ArrowRight className="mt-1.5 size-4 shrink-0 text-copper" aria-hidden />
                  <Markdown inline>{w}</Markdown>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {intro.trackHooks ? <TrackNotes intro notes={intro.trackHooks} /> : null}

        {intro.prior ? (
          <section aria-labelledby="prior-h" className="max-w-[72ch] rounded-md border border-line bg-panel-2 px-4 py-3">
            <h2 id="prior-h" className="mb-1 font-semibold text-ink">
              ความรู้พื้นฐานที่ควรมี
            </h2>
            <Markdown className="text-ink-2 [&_p:last-child]:mb-0">{intro.prior}</Markdown>
          </section>
        ) : null}

        {warmups.length ? (
          <section aria-labelledby="warm-h">
            <h2 id="warm-h" className="text-[1.15rem] font-semibold text-ink">
              อุ่นเครื่องก่อนเรียน
            </h2>
            <p className="text-ink-3">ลองตอบดูก่อน ไม่มีผลต่อคะแนน ผิดได้และจะได้รู้ว่าควรสังเกตอะไรในบทเรียน</p>
            {warmups.map((it) => (
              <InteractionView key={it.id} it={it} />
            ))}
          </section>
        ) : null}

        {showPretest ? (
          <section aria-labelledby="pre-h" className="rounded-md border border-line bg-panel p-5">
            <h2 id="pre-h" className="mb-1 flex items-center gap-2 text-[1.15rem] font-semibold text-ink">
              <ClipboardList className="size-5 text-cobalt" aria-hidden />
              แบบทดสอบก่อนเรียน
            </h2>
            <QuizRunner
              api={api}
              week={slice.week}
              kind="pre"
              allowRetry={false}
              startLabel="เริ่มแบบทดสอบก่อนเรียน"
              onResult={(r) => setProgress((p) => ({ ...p, pretest: { percent: r.percent, at: new Date().toISOString() } }))}
              intro={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-[60ch] text-ink-2">5 ข้อ ทำครั้งเดียว ไม่นับคะแนน ช่วยให้รู้ว่าตอนนี้เข้าใจเรื่องนี้แค่ไหน</p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      try {
                        localStorage.setItem(skipKey(slice.week), "1");
                      } catch {}
                      setSkipped(true);
                    }}
                  >
                    ข้าม
                  </Button>
                </div>
              }
            />
          </section>
        ) : progress.pretest ? (
          <p className="text-ink-3">ทำแบบทดสอบก่อนเรียนแล้ว ได้ {Math.round(progress.pretest.percent)}%</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          {error ? (
            <Alert tone="danger" title="ไปขั้นเรียนรู้ไม่สำเร็จ" className="w-full">
              {error}
            </Alert>
          ) : null}
          <Button size="lg" onClick={start} disabled={busy}>
            {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
            เริ่มเรียน
          </Button>
          <p className="text-ink-3">
            {slice.stepMeta.length} ขั้น ประมาณ {slice.stepMeta.reduce((a, s) => a + s.minutes, 0)} นาที
          </p>
        </div>
      </div>
    </FigureNumbersProvider>
  );
}
