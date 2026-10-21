import { db } from "@/lib/db";
import { gradebook } from "@/server/core/staff";
import { exportClassTable } from "@/server/export-route";

/** GET /api/export/gradebook?class=<id>&format=csv|xlsx */
export async function GET(request: Request) {
  return exportClassTable(request, "gradebook", (classId) => gradebook(db, classId));
}
