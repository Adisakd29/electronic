import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LogIn } from "lucide-react";
import type { PracticeActivity } from "@/content/types";
import { activityById, weekContent } from "@/server/content";
import { getSessionUser } from "@/server/auth";
import { getWeekProgress } from "@/server/queries";
import { Alert, LinkButton, Panel, PanelHeader } from "@/components/ui";
import { Safe } from "@/components/shell/Safe";
import { Markdown } from "@/components/learn/Markdown";
import { PrintButton } from "@/components/learn/worksheet/PrintButton";
import { WorksheetSheet } from "@/components/learn/worksheet/WorksheetSheet";
import { WorksheetUpload } from "@/components/learn/worksheet/WorksheetUpload";
import { WEEK_NUMBERS, loginHref, parseWeek } from "../../../_lib/route";

type Params = Promise<{ week: string; activityId: string }>;

export function generateStaticParams() {
  const out = WEEK_NUMBERS.flatMap((n) => (weekContent(n)?.activities ?? []).map((a) => ({ week: String(n), activityId: a.id })));
  // Cache Components needs at least one param set; a placeholder 404s via notFound().
  return out.length ? out : [{ week: "1", activityId: "__none__" }];
}

function decode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function resolve(week: string, activityId: string) {
  const n = parseWeek(week);
  if (!n) return null;
  const w = weekContent(n);
  const a = activityById(w, decode(activityId));
  return w && a ? { n, w, a } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { week, activityId } = await params;
  const r = resolve(week, activityId);
  return { title: r ? `ใบงาน ${r.a.title} · สัปดาห์ที่ ${r.n}` : "ไม่พบใบงาน" };
}

/** Session-dependent part (screen only): upload form + submission status. */
async function SubmitSection({ week, activity, path }: { week: number; activity: PracticeActivity; path: string }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="space-y-3 px-5 py-4">
        <p className="text-ink-2">เข้าสู่ระบบก่อน จึงจะส่งไฟล์ใบงานและดูผลการตรวจได้</p>
        <LinkButton href={loginHref(path)} variant="secondary">
          <LogIn className="size-5" aria-hidden />
          เข้าสู่ระบบเพื่อส่งงาน
        </LinkButton>
      </div>
    );
  }
  if (user.role !== "student") {
    return (
      <div className="space-y-4 px-5 py-4">
        <Alert tone="info" title="การส่งไฟล์มีไว้สำหรับนักเรียน">
          ครูดูและให้คะแนนงานที่นักเรียนส่งได้ที่หน้า{" "}
          <Link href="/teacher/submissions" className="font-semibold text-cobalt-ink underline underline-offset-4">
            งานที่นักเรียนส่ง
          </Link>
        </Alert>
        {activity.expected ? (
          <div>
            <h3 className="mb-1 font-semibold text-ink">ผลที่คาดหวัง (ครูเห็นเท่านั้น)</h3>
            <Markdown className="text-ink-2 [&_p:last-child]:mb-0">{activity.expected}</Markdown>
          </div>
        ) : null}
      </div>
    );
  }
  const progress = await getWeekProgress(week);
  if (!progress.unlocked) {
    return (
      <div className="px-5 py-4">
        <Alert tone="warn" title={`สัปดาห์ที่ ${week} ยังล็อกอยู่`}>
          {progress.lockReason ?? "ทำสัปดาห์ก่อนหน้าให้ผ่านเกณฑ์ก่อน แล้วจึงส่งใบงานของสัปดาห์นี้ได้"}
        </Alert>
      </div>
    );
  }
  return (
    <div className="px-5 py-4">
      <WorksheetUpload
        week={week}
        activityId={activity.id}
        criteria={activity.rubric.map((r) => r.criterion)}
        initial={progress.submissions[activity.id] ?? null}
      />
    </div>
  );
}

function SubmitSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดสถานะการส่งงาน" className="space-y-3 px-5 py-4">
      <div className="ee-skeleton h-20 rounded-md" />
      <div className="ee-skeleton h-11 w-full max-w-[420px] rounded-sm" />
      <div className="ee-skeleton h-11 w-32 rounded-sm" />
    </div>
  );
}

export default async function WorksheetPage({ params }: { params: Params }) {
  const { week, activityId } = await params;
  const r = resolve(week, activityId);
  if (!r) notFound();
  const { n, w, a } = r;
  const path = `/learn/${n}/worksheet/${encodeURIComponent(a.id)}`;

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/learn/${n}/lab`}
          className="inline-flex items-center gap-1.5 rounded-sm font-semibold text-cobalt-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          กลับไปห้องทดลองเสมือน สัปดาห์ที่ {n}
        </Link>
        <PrintButton />
      </div>
      <p className="mb-4 max-w-[68ch] text-[0.95rem] text-ink-3 print:hidden">
        พิมพ์ใบงานบนกระดาษ A4 นำไปบันทึกผลในโรงฝึกงาน
        {a.submit ? " แล้วถ่ายรูปหรือสแกนส่งในส่วนส่งใบงานด้านล่าง" : " ใบงานนี้ไม่ต้องส่งไฟล์ ครูประเมินในชั้นเรียน"}
      </p>

      <WorksheetSheet activity={a} week={n} weekTitle={w.title} />

      {a.submit ? (
        <Panel className="mt-8 print:hidden" aria-labelledby="ws-submit-h">
          <PanelHeader
            title={<span id="ws-submit-h">ส่งใบงาน</span>}
            description="ส่งได้ทั้งรูปถ่ายและไฟล์สแกน ครูจะตรวจตามเกณฑ์การประเมินในใบงาน"
          />
          <Safe
            fallback={
              <div className="px-5 py-4">
                <Alert tone="danger" title="โหลดสถานะการส่งงานไม่สำเร็จ">
                  โหลดหน้านี้ใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งครูผู้สอน
                </Alert>
              </div>
            }
          >
            <Suspense fallback={<SubmitSkeleton />}>
              <SubmitSection week={n} activity={a} path={path} />
            </Suspense>
          </Safe>
        </Panel>
      ) : null}
    </div>
  );
}
