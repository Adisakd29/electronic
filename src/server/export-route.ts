import "server-only";
import { db } from "@/lib/db";
import { viewerCanManageClass } from "@/lib/access";
import { attachment, toCsv, toXlsx, type Cell } from "@/lib/export";
import { classroom } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "./auth";

/** Shared logic of the CSV/XLSX export route handlers (staff only, class access checked). */
export async function exportClassTable(request: Request, kind: string, build: (classId: string) => Promise<Cell[][]>) {
  const user = await getSessionUser();
  if (!user || user.role === "student") return new Response("ไม่มีสิทธิ์ดาวน์โหลดรายงานนี้", { status: 403 });
  const url = new URL(request.url);
  const classId = url.searchParams.get("class") ?? "";
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!classId || !(await viewerCanManageClass(db, { id: user.id, role: user.role }, classId))) {
    return new Response("ไม่พบห้องเรียน หรือคุณไม่มีสิทธิ์ในห้องเรียนนี้", { status: 404 });
  }
  const [c] = await db.select({ name: classroom.name, term: classroom.term }).from(classroom).where(eq(classroom.id, classId));
  const rows = await build(classId);
  const base = `${kind}_${c.name}_${c.term}`.replace(/[\\/:*?"<>|\s]+/g, "-");
  if (format === "xlsx") {
    const buf = await toXlsx([{ name: kind, rows }]);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": attachment(`${base}.xlsx`),
        "Cache-Control": "private, no-store",
      },
    });
  }
  return new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": attachment(`${base}.csv`), "Cache-Control": "private, no-store" },
  });
}
