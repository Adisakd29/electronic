import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSidebarData } from "@/server/queries";
import { PageSkeleton } from "@/components/learn/player/static";
import { guestModeEnabled } from "@/lib/env";
import { GuestRedirect } from "@/components/learn/GuestRedirect";
import { loginHref, resumeHref } from "./_lib/route";

export const metadata: Metadata = { title: "บทเรียน" };

/** Reads the session, then sends the learner to where they stopped. */
async function Resume() {
  const d = await getSidebarData();
  if (!d && guestModeEnabled()) return <GuestRedirect />;
  if (!d) redirect(loginHref("/learn"));
  redirect(resumeHref(d));
}

export default function LearnIndexPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Resume />
    </Suspense>
  );
}
