import { describe, expect, it } from "vitest";
import { canManageClass, canManageStudent, canReadFile, canViewStudent } from "@/lib/access";

const student = { id: "s1", role: "student" as const };
const other = { id: "s2", role: "student" as const };
const teacher = { id: "t1", role: "teacher" as const };
const admin = { id: "a1", role: "admin" as const };

describe("access control", () => {
  it("students see only their own data", () => {
    expect(canViewStudent(student, "s1", [], ["c1"])).toBe(true);
    expect(canViewStudent(other, "s1", [], ["c1"])).toBe(false);
    // even if a student were (wrongly) passed class ids, role decides
    expect(canViewStudent(other, "s1", ["c1"], ["c1"])).toBe(false);
  });
  it("teachers see only students of classes they teach", () => {
    expect(canViewStudent(teacher, "s1", ["c1"], ["c1", "c2"])).toBe(true);
    expect(canViewStudent(teacher, "s1", ["c3"], ["c1", "c2"])).toBe(false);
    expect(canViewStudent(teacher, "s1", [], [])).toBe(false);
  });
  it("admins see everyone", () => {
    expect(canViewStudent(admin, "s1", [], [])).toBe(true);
  });
  it("only staff can manage students", () => {
    expect(canManageStudent(student, "s1", [], ["c1"])).toBe(false);
    expect(canManageStudent(teacher, "s1", ["c1"], ["c1"])).toBe(true);
    expect(canManageStudent(teacher, "s1", ["c2"], ["c1"])).toBe(false);
  });
  it("class management", () => {
    expect(canManageClass(teacher, "c1", ["c1"])).toBe(true);
    expect(canManageClass(teacher, "c2", ["c1"])).toBe(false);
    expect(canManageClass(student, "c1", ["c1"])).toBe(false);
    expect(canManageClass(admin, "c9", [])).toBe(true);
  });
  it("file downloads follow the same rule", () => {
    expect(canReadFile(other, "s1", [], ["c1"])).toBe(false);
    expect(canReadFile(student, "s1", [], [])).toBe(true);
    expect(canReadFile(teacher, "s1", ["c1"], ["c1"])).toBe(true);
  });
});
