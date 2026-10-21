import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { stages, weekMeta, type StageKey } from "@/content/course";
import type { Week } from "@/content/types";
import { weekContent } from "@/server/content";
import { getSessionUser } from "@/server/auth";
import { getMyTrack, getWeekProgress } from "@/server/queries";
import { Alert, LinkButton } from "@/components/ui";
import { Safe } from "@/components/shell/Safe";
import { buildSlice } from "@/components/learn/slice";
import { LessonPlayer } from "@/components/learn/player/LessonPlayer";
import { GuestLesson } from "@/components/learn/player/GuestLesson";
import { guestMaxWeek, guestModeEnabled } from "@/lib/env";
import { WeekHeader } from "@/components/learn/player/WeekHeader";
import { LockedScreen, StageLockedScreen, StageSkeleton } from "@/components/learn/player/static";
import { WEEK_NUMBERS, isStage, loginHref, parseWeek, stageLabel, stepParam } from "../../_lib/route";

type Params = Promise<{ week: string; stage: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** 18 weeks × 6 stages are prerendered; only the progress section is dynamic. */
export function generateStaticParams() {
  return WEEK_NUMBERS.flatMap((n) => stages.map((s) => ({ week: String(n), stage: s.key })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { week, stage } = await params;
  const n = parseWeek(week);
  if (!n || !isStage(stage)) return { title: "ไม่พบบทเรียน" };
  const title = weekContent(n)?.title ?? weekMeta[n - 1].title;
  return {
    title: `${stageLabel(stage)} · สัปดาห์ที่ ${n} ${title}`,
    description: `บทเรียนสัปดาห์ที่ ${n} ${title} ขั้น${stageLabel(stage)}`,
  };
}

function nextWeekInfo(n: number) {
  const m = weekMeta[n]; // weekMeta is 0-based → index n is week n + 1
  return m ? { week: m.week, title: m.title, href: `/learn/${m.week}` } : null;
}

/** Session + progress: request-time, streamed behind Suspense. */
async function StageBody({ w, stage, searchParams }: { w: Week; stage: StageKey; searchParams: SearchParams }) {
  const n = w.week;
  const user = await getSessionUser();
  if (!user && guestModeEnabled()) {
    if (n > guestMaxWeek()) {
      return (
        <section className="rounded-md border border-line bg-panel p-6 text-center sm:p-10" aria-labelledby="guest-limit-h">
          <h2 id="guest-limit-h" className="text-[1.3rem] font-bold text-ink">ผู้เยี่ยมชมเปิดดูได้ถึงสัปดาห์ที่ {guestMaxWeek()}</h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-ink-2">สัปดาห์ที่ {n} เปิดให้นักเรียนที่เข้าสู่ระบบ เพื่อให้ครูติดตามผลการเรียนและปลดล็อกตามเกณฑ์ของห้องเรียนได้</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href={loginHref(`/learn/${n}/${stage}`)}>เข้าสู่ระบบ</LinkButton>
            <LinkButton href={`/learn/${guestMaxWeek()}`} variant="secondary">ไปสัปดาห์ที่ {guestMaxWeek()}</LinkButton>
          </div>
        </section>
      );
    }
    return <GuestLesson slice={buildSlice(w, stage)} stage={stage} basePath={`/learn/${n}`} nextWeek={nextWeekInfo(n)} />;
  }
  if (!user) {
    const step = stage === "learn" ? stepParam((await searchParams).step) : null;
    redirect(loginHref(`/learn/${n}/${stage}${step ? `?step=${step}` : ""}`));
  }
  const [progress, track] = await Promise.all([getWeekProgress(n), getMyTrack()]);
  if (!progress.unlocked) return <LockedScreen week={n} reason={progress.lockReason} />;
  const isStaff = user.role !== "student";
  if (!isStaff && !progress.stagesOpen.includes(stage)) {
    return <StageLockedScreen basePath={`/learn/${n}`} stage={stage} stagesDone={progress.stagesDone} stagesOpen={progress.stagesOpen} />;
  }
  return (
    <LessonPlayer
      slice={buildSlice(w, stage)}
      stage={stage}
      progress={progress}
      isStaff={isStaff}
      track={track}
      basePath={`/learn/${n}`}
      teacherNotes={isStaff ? w.teacherNotes : undefined}
      nextWeek={nextWeekInfo(n)}
    />
  );
}

export default async function StagePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { week, stage } = await params;
  const n = parseWeek(week);
  if (!n || !isStage(stage)) notFound();
  const w = weekContent(n);
  if (!w) notFound();
  const basePath = `/learn/${n}`;

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <WeekHeader week={n} title={w.title} titleEn={w.titleEn} category={w.category} unitNo={w.unit.no} hours={w.hours} />
      <Safe
        fallback={
          <Alert tone="danger" title="โหลดความก้าวหน้าไม่สำเร็จ">
            ระบบอ่านข้อมูลการเรียนของคุณไม่ได้ในตอนนี้ โหลดหน้านี้ใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งครูผู้สอน
          </Alert>
        }
      >
        <Suspense fallback={<StageSkeleton basePath={basePath} stage={stage} />}>
          <StageBody w={w} stage={stage} searchParams={searchParams} />
        </Suspense>
      </Safe>
    </div>
  );
}
