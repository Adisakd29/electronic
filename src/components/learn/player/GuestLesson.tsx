"use client";
/** Lesson player for visitors without an account: same player, progress kept in this browser. */
import { useEffect, useMemo, useState } from "react";
import type { StageKey } from "@/content/course";
import type { WeekProgress } from "@/server/contracts";
import { LearnApiProvider, wrapApi } from "../api";
import { createGuestApi, guestProgress } from "../guest";
import type { WeekSlice } from "../slice";
import type { NextWeekInfo } from "./context";
import { LessonPlayer } from "./LessonPlayer";
import { StageLockedScreen, StageSkeleton } from "./static";

export function GuestLesson({ slice, stage, basePath, nextWeek }: { slice: WeekSlice; stage: StageKey; basePath: string; nextWeek: NextWeekInfo | null }) {
  const api = useMemo(() => wrapApi(createGuestApi(slice)), [slice]);
  // localStorage exists only in the browser: read it after mount, show the skeleton until then.
  const [progress, setProgress] = useState<WeekProgress | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setProgress(guestProgress(slice)), 0);
    return () => clearTimeout(t);
  }, [slice]);

  if (!progress) return <StageSkeleton basePath={basePath} stage={stage} />;
  if (stage !== "quiz" && !progress.stagesOpen.includes(stage)) {
    return <StageLockedScreen basePath={basePath} stage={stage} stagesDone={progress.stagesDone} stagesOpen={progress.stagesOpen} skipQuiz />;
  }
  return (
    <LearnApiProvider api={api}>
      <LessonPlayer slice={slice} stage={stage} progress={progress} isStaff={false} isGuest basePath={basePath} nextWeek={nextWeek} />
    </LearnApiProvider>
  );
}
