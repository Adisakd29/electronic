import { db } from "@/lib/db";
import { itemAnalysisRows } from "@/server/core/staff";
import { exportClassTable } from "@/server/export-route";

/** GET /api/export/items?class=<id>&format=csv|xlsx — item analysis for all weeks. */
export async function GET(request: Request) {
  return exportClassTable(request, "item-analysis", (classId) => itemAnalysisRows(db, classId));
}
