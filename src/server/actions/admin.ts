"use server";
/** Admin Server Actions. Each re-reads the session; core functions re-check the admin role. */
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import type { Role } from "../contracts";
import * as SA from "../core/staff-actions";
import { getActor, unexpected } from "../session";
import type { FormState } from "./form-state";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function adminRun(where: string, fn: (actor: { id: string; role: Role }) => Promise<SA.Result<unknown> & { extra?: Partial<FormState> }>): Promise<FormState> {
  try {
    const a = await getActor(["admin"]);
    if (!a.ok) return { error: a.error, ts: Date.now() };
    const r = await fn(a.actor);
    if (!r.ok) return { error: r.error, ts: Date.now() };
    refresh();
    return { ok: true, message: r.message ?? "บันทึกแล้ว", ...(r.extra ?? {}), ts: Date.now() };
  } catch (e) {
    return { ...unexpected(e, where), ts: Date.now() };
  }
}

export async function createUserAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("createUser", async (a) => {
    const r = await db.transaction((tx) =>
      SA.adminCreateUser(tx, a, {
        username: str(fd, "username"),
        name: str(fd, "name"),
        role: (str(fd, "role") || "student") as Role,
        studentNo: str(fd, "studentNo") || null,
        classroomId: str(fd, "classroomId") || null,
      }),
    );
    if (!r.ok) return r;
    return { ...r, extra: { secrets: [{ label: `รหัสผ่านชั่วคราวของ ${r.data.username}`, value: r.data.password }] } };
  });
}

export async function setRoleAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("setRole", (a) => db.transaction((tx) => SA.adminSetRole(tx, a, str(fd, "userId"), str(fd, "role") as Role)));
}

export async function setDisabledAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("setDisabled", (a) => db.transaction((tx) => SA.adminSetDisabled(tx, a, str(fd, "userId"), str(fd, "disabled") === "1")));
}

export async function adminResetPasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("resetPassword", async (a) => {
    const r = await db.transaction((tx) => SA.resetPassword(tx, a, str(fd, "userId")));
    if (!r.ok) return r;
    return { ...r, extra: { secrets: [{ label: `รหัสผ่านชั่วคราวของ ${r.data.username ?? "ผู้ใช้"}`, value: r.data.password }] } };
  });
}

export async function createClassroomAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("createClassroom", (a) => db.transaction((tx) => SA.adminCreateClassroom(tx, a, str(fd, "name"), str(fd, "term"))));
}

export async function archiveClassroomAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("archiveClassroom", (a) => db.transaction((tx) => SA.adminArchiveClassroom(tx, a, str(fd, "classId"), str(fd, "archived") === "1")));
}

export async function joinCodeAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("joinCode", (a) => db.transaction((tx) => SA.adminRegenerateJoinCode(tx, a, str(fd, "classId"))));
}

export async function assignTeacherAction(_p: FormState, fd: FormData): Promise<FormState> {
  return adminRun("assignTeacher", (a) => db.transaction((tx) => SA.adminAssignTeacher(tx, a, str(fd, "classId"), str(fd, "username"), str(fd, "assign") !== "0")));
}

export async function enrolAction(_p: FormState, fd: FormData): Promise<FormState> {
  const names = String(fd.get("usernames") ?? "").split(/[\s,]+/);
  return adminRun("enrol", (a) => db.transaction((tx) => SA.enrolStudents(tx, a, str(fd, "classId"), names, str(fd, "enrol") !== "0")));
}
