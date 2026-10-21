import "server-only";
import { db } from "@/lib/db";
import type { PublicCertificate, SidebarData, StudentOverview, WeekProgress } from "./contracts";
import { getSessionUser, requireUser } from "./auth";
import { sidebarData, studentOverview, weekProgress } from "./core/overview";
import { certificateByCode, normalizeCertificateCode } from "./core/certificate";
import { competencyProfile } from "./core/competency";
import type { CompetencyProfile } from "@/lib/competency-domains";

/**
 * Read functions for Server Components.
 * Each resolves the current user itself (never accepts a userId from callers).
 * Call inside a <Suspense> boundary (they read the request's cookies).
 */

/** Data for the 18-week sidebar & "continue learning" button. null when signed out. */
export async function getSidebarData(): Promise<SidebarData | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const d = await sidebarData(db, user);
  if (user.role === "student") return d;
  // Teachers/admins preview every week.
  return { ...d, weeks: d.weeks.map((w) => ({ ...w, unlocked: true, lockReason: null })) };
}

/** Student dashboard data for the signed-in student. */
export async function getStudentOverview(): Promise<StudentOverview> {
  const user = await requireUser();
  return studentOverview(db, user);
}

/** 4-domain competency profile of the signed-in learner (simulation evidence + teacher-recorded results). */
export async function getMyCompetencyProfile(): Promise<CompetencyProfile> {
  const user = await requireUser();
  return competencyProfile(db, user.id);
}

/** Progress of the signed-in user in one week (includes unlock state). */
export async function getWeekProgress(week: number): Promise<WeekProgress> {
  const user = await requireUser();
  const w = Number.isInteger(week) && week >= 1 && week <= 18 ? week : 1;
  const p = await weekProgress(db, user.id, w);
  // Staff preview every week.
  if (user.role !== "student") return { ...p, unlocked: true, lockReason: null };
  return p;
}

/**
 * Public certificate lookup by verification code (no session needed).
 * Returns null for malformed, unknown or revoked codes. Only name, date and code.
 */
export async function getCertificateByCode(code: string): Promise<PublicCertificate | null> {
  const c = normalizeCertificateCode(code);
  if (!c) return null;
  return certificateByCode(db, c);
}

/** Trade used for lesson examples for the signed-in user (null when signed out). */
export async function getMyTrack(): Promise<import("./core/track").TrackInfo | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const { trackInfo } = await import("./core/track");
  return trackInfo(db, user.id);
}
