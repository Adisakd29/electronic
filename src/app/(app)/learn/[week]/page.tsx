import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { weekMeta } from "@/content/course";
import { getSessionUser } from "@/server/auth";
import { getWeekProgress } from "@/server/queries";
import { PageSkeleton } from "@/components/learn/player/static";
import { guestModeEnabled } from "@/lib/env";
import { GuestRedirect } from "@/components/learn/GuestRedirect";
import { WEEK_NUMBERS, loginHref, parseWeek, stageHref } from "../_lib/route";

type Params = Promise<{ week: string }>;

export function generateStaticParams() {
  return WEEK_NUMBERS.map((n) => ({ week: String(n) }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const n = parseWeek((await params).week);
  return { title: n ? `สัปดาห์ที่ ${n} ${weekMeta[n - 1].title}` : "ไม่พบสัปดาห์นี้" };
}

/** Sends the learner to the stage they last worked on in this week (or the intro). */
async function WeekResume({ week }: { week: number }) {
  const user = await getSessionUser();
  if (!user && guestModeEnabled()) return <GuestRedirect week={week} />;
  if (!user) redirect(loginHref(`/learn/${week}`));
  const p = await getWeekProgress(week);
  redirect(p.position ? stageHref(week, p.position.stage, p.position.stepIndex) : `/learn/${week}/intro`);
}

export default async function WeekIndexPage({ params }: { params: Params }) {
  const n = parseWeek((await params).week);
  if (!n) notFound();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WeekResume week={n} />
    </Suspense>
  );
}
