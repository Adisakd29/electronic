"use client";
/** Visitors without an account: continue where this browser stopped (or start the week / week 1). */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { guestResume, guestWeekPosition } from "./guest";
import { PageSkeleton } from "./player/static";

const href = (week: number, stage: string, stepIndex: number) => `/learn/${week}/${stage}${stage === "learn" ? `?step=${stepIndex + 1}` : ""}`;

export function GuestRedirect({ week }: { week?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (week) {
      const p = guestWeekPosition(week);
      router.replace(p ? href(week, p.stage, p.stepIndex) : `/learn/${week}/intro`);
    } else {
      const r = guestResume();
      router.replace(r ? href(r.week, r.stage, r.stepIndex) : "/learn/1/intro");
    }
  }, [router, week]);
  return <PageSkeleton />;
}
