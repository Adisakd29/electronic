"use server";
/**
 * Teacher Server Actions (also available to admins). Each re-reads the session
 * and the core functions check class/student access.
 */
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import type { UnlockRule } from "@/lib/db/schema";
import { toCsv } from "@/lib/export";
import type { Role } from "../contracts";
import * as SA from "../core/staff-actions";
import { getActor, unexpected } from "../session";
import type { FormState } from "./form-state";

const STAFF: Role[] = ["teacher", "admin"];
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === "" ? null : Number(v);
};

async function staffRun(where: string, fn: (actor: { id: string; role: Role }) => Promise<SA.Result<unknown> & { extra?: Partial<FormState> }>): Promise<FormState> {
  try {
    const a = await getActor(STAFF);
    if (!a.ok) return { error: a.error, ts: Date.now() };
    const r = await fn(a.actor);
    if (!r.ok) return { error: r.error, ts: Date.now() };
    refresh();
    return { ok: true, message: r.message ?? "บันทึกแล้ว", ...(r.extra ?? {}), ts: Date.now() };
  } catch (e) {
    return { ...unexpected(e, where), ts: Date.now() };
  }
}

export async function grantOverrideAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("grantOverride", (a) => db.transaction((tx) => SA.grantWeekOverride(tx, a, str(fd, "studentId"), str(fd, "week"), str(fd, "note"))));
}

export async function revokeOverrideAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("revokeOverride", (a) => db.transaction((tx) => SA.revokeWeekOverride(tx, a, str(fd, "studentId"), str(fd, "week"))));
}

export async function resetPasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("resetPassword", async (a) => {
    const r = await db.transaction((tx) => SA.resetPassword(tx, a, str(fd, "userId")));
    if (!r.ok) return r;
    return { ...r, extra: { secrets: [{ label: `รหัสผ่านชั่วคราวของ ${r.data.username ?? "ผู้ใช้"}`, value: r.data.password }] } };
  });
}

export async function issueCertificateAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("issueCertificate", (a) => db.transaction((tx) => SA.issueCertificate(tx, a, str(fd, "studentId"))));
}

export async function revokeCertificateAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("revokeCertificate", (a) => db.transaction((tx) => SA.revokeCertificate(tx, a, str(fd, "studentId"))));
}

export async function gradeSubmissionAction(_p: FormState, fd: FormData): Promise<FormState> {
  const mode = str(fd, "mode") === "return" ? "return" : "grade";
  const levels: number[] = [];
  for (let i = 0; i < 20; i++) {
    const v = fd.get(`level-${i}`);
    if (v == null) break;
    levels.push(Number(v));
  }
  return staffRun("gradeSubmission", (a) => db.transaction((tx) => SA.gradeSubmission(tx, a, str(fd, "submissionId"), levels, str(fd, "feedback"), mode)));
}

export async function saveCompetencyAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("saveCompetency", (a) =>
    db.transaction((tx) =>
      SA.saveCompetency(tx, a, {
        studentId: str(fd, "studentId"),
        classroomId: str(fd, "classroomId") || null,
        competency: Number(str(fd, "competency")),
        level: Number(str(fd, "level")),
        score: num(fd, "score"),
        maxScore: num(fd, "maxScore"),
        passed: fd.get("passed") === "on" || fd.get("passed") === "true",
        note: str(fd, "note") || null,
      }),
    ),
  );
}

function ruleFrom(fd: FormData, prefix: string): Partial<UnlockRule> {
  return {
    requireLearn: fd.get(`${prefix}requireLearn`) === "on",
    requirePractice: fd.get(`${prefix}requirePractice`) === "on",
    requireLab: fd.get(`${prefix}requireLab`) === "on",
    requireAssignments: fd.get(`${prefix}requireAssignments`) === "on",
    minQuizPercent: Number(fd.get(`${prefix}minQuizPercent`) ?? 0),
    requireStageOrder: fd.get(`${prefix}requireStageOrder`) === "on",
  };
}

export async function saveUnlockPolicyAction(_p: FormState, fd: FormData): Promise<FormState> {
  const weekRules: Record<string, Partial<UnlockRule>> = {};
  for (let w = 2; w <= 18; w++) if (fd.get(`w${w}-custom`) === "on") weekRules[String(w)] = ruleFrom(fd, `w${w}-`);
  return staffRun("saveUnlockPolicy", (a) =>
    db.transaction((tx) => SA.saveUnlockPolicy(tx, a, str(fd, "classId"), { enabled: fd.get("enabled") === "on", defaultRule: ruleFrom(fd, "d-"), weekRules })),
  );
}

export async function setWeekOpenAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("setWeekOpen", (a) => db.transaction((tx) => SA.setWeekOpen(tx, a, str(fd, "classId"), str(fd, "week"), str(fd, "open") === "1")));
}

export async function saveQuestionAction(_p: FormState, fd: FormData): Promise<FormState> {
  const type = str(fd, "type") as "mcq" | "tf" | "numeric";
  const ids = ["a", "b", "c", "d"] as const;
  const choices = type === "mcq" ? ids.map((id) => ({ id, text: str(fd, `choice-${id}`) })) : null;
  const feedback = type === "mcq" ? Object.fromEntries(ids.map((id) => [id, str(fd, `feedback-${id}`)])) : null;
  const answer = type === "mcq" ? str(fd, "answer-mcq") : type === "tf" ? str(fd, "answer-tf") : str(fd, "answer-numeric");
  const tol = num(fd, "tolerance");
  return staffRun("saveQuestion", (a) =>
    db.transaction((tx) =>
      SA.saveQuestion(tx, a, {
        id: str(fd, "id") || undefined,
        week: Number(str(fd, "week")),
        type,
        bloom: str(fd, "bloom") as "remember",
        objective: str(fd, "objective") || null,
        stem: str(fd, "stem"),
        choices,
        answer,
        tolerance: tol == null ? null : tol / 100,
        unit: str(fd, "unit") || null,
        explanation: str(fd, "explanation"),
        feedback,
        active: fd.get("active") === "on",
      }),
    ),
  );
}

export async function bulkCreateStudentsAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("bulkCreate", async (a) => {
    const r = await db.transaction((tx) => SA.bulkCreateStudents(tx, a, str(fd, "classId"), String(fd.get("lines") ?? "")));
    if (!r.ok) return r;
    const csv = toCsv([["username", "ชื่อ-นามสกุล", "เลขประจำตัว", "รหัสผ่านชั่วคราว"], ...r.data.created.map((c) => [c.username, c.name, c.studentNo, c.password])]);
    return {
      ...r,
      message: [r.message, ...r.data.errors].filter(Boolean).join("\n"),
      extra: {
        secrets: r.data.created.map((c) => ({ label: `${c.username} — ${c.name}`, value: c.password })),
        csv: r.data.created.length ? { fileName: "บัญชีนักเรียนใหม่.csv", text: csv } : undefined,
      },
    };
  });
}

export async function addAllowlistAction(_p: FormState, fd: FormData): Promise<FormState> {
  const role = (str(fd, "role") || "student") as Role;
  return staffRun("addAllowlist", (a) => db.transaction((tx) => SA.addAllowlist(tx, a, str(fd, "pattern"), role, str(fd, "classId") || null)));
}

export async function removeAllowlistAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("removeAllowlist", (a) => db.transaction((tx) => SA.removeAllowlist(tx, a, str(fd, "id"))));
}

export async function unenrolStudentAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("unenrol", (a) => db.transaction((tx) => SA.enrolStudents(tx, a, str(fd, "classId"), [str(fd, "username")], false)));
}

/** Teacher/admin: default trade of a class (used for lesson examples of its students). */
export async function setClassTrackAction(_p: FormState, fd: FormData): Promise<FormState> {
  return staffRun("setClassTrack", async (a) => {
    const { setClassTrack } = await import("../core/track");
    const r = await db.transaction((tx) => setClassTrack(tx, a, str(fd, "classId"), str(fd, "track")));
    return r.ok ? { ok: true as const, data: null, message: "บันทึกแผนกของห้องแล้ว" } : r;
  });
}
