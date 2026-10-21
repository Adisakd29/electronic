import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  FileCheck2,
  FileClock,
  FileWarning,
  History,
  Lock,
  School,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { categoryInfo, stages, weekMeta } from "@/content/course";
import { ACHIEVEMENTS, LEVELS } from "@/lib/gamification";
import { getMyCompetencyProfile, getMyTrack, getStudentOverview } from "@/server/queries";
import { TrackPicker, TrackProvider } from "@/components/learn/track";
import { getSessionUser, homeFor } from "@/server/auth";
import type { PendingAssignment, StudentOverview, WeekStatus } from "@/server/contracts";
import { EmptyState, LinkButton, PageHeader, Panel, PanelHeader, ProgressBar, ProgressRing } from "@/components/ui";
import { PcbRoadmap } from "@/components/shell/PcbRoadmap";
import { fmtDate, fmtDateTime } from "@/components/staff/format";
import { CompetencyDomainsPanel } from "@/components/staff/CompetencyDomains";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "แดชบอร์ดของฉัน",
  description: "ความก้าวหน้า XP เหรียญรางวัล ใบงาน และผลแบบทดสอบของฉันในรายวิชา",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader title="แดชบอร์ดของฉัน" description="ดูว่าเรียนถึงไหนแล้ว อะไรต้องทำต่อ และผลการเรียนแต่ละสัปดาห์" />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------

function resumeHref(d: StudentOverview) {
  const r = d.resume;
  if (!r) return { href: `/learn/${d.currentWeek}`, week: d.currentWeek };
  return { href: `/learn/${r.week}/${r.stage}${r.stage === "learn" ? `?step=${r.stepIndex + 1}` : ""}`, week: r.week };
}

async function DashboardBody() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "student") redirect(homeFor(user.role));
  const [d, profile, track] = await Promise.all([getStudentOverview(), getMyCompetencyProfile(), getMyTrack()]);
  return (
    <div className="space-y-8">
      <Summary d={d} />
      <TrackProvider initial={track}>
        <section aria-label="แผนกของฉัน" className="rounded-md border border-line bg-panel px-4 py-3">
          <TrackPicker />
          <p className="mt-1 text-[0.92rem] text-ink-3">บทเรียนจะยกตัวอย่างจากงานของแผนกที่เลือก เนื้อหาและการประเมินเหมือนกันทุกแผนก</p>
        </section>
      </TrackProvider>
      <section aria-labelledby="map-h">
        <h2 id="map-h" className="mb-2 text-[1.15rem] font-semibold text-ink">
          แผนที่การเรียน
        </h2>
        <PcbRoadmap compact statuses={d.weeks} current={d.currentWeek} />
      </section>
      <WeekGrid weeks={d.weeks} current={d.currentWeek} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Assignments items={d.assignments} />
        <QuizHistory history={d.quizHistory} />
      </div>
      <CompetencyDomainsPanel profile={profile} />
      <Achievements d={d} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Recent items={d.recent} currentWeek={d.currentWeek} />
        <div className="space-y-6">
          <Certificate d={d} />
          <Classrooms items={d.classrooms} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary: current week, overall progress, XP/level
// ---------------------------------------------------------------------------

function Summary({ d }: { d: StudentOverview }) {
  const cur = d.weeks.find((w) => w.week === d.currentWeek);
  const m = weekMeta[d.currentWeek - 1];
  const cat = categoryInfo[m.category];
  const r = resumeHref(d);
  const done = d.weeks.filter((w) => w.completed).length;
  const g = d.gamification;
  const next = LEVELS.find((l) => l.level === g.level + 1);
  const allDone = done === d.weeks.length;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel className="relative overflow-hidden">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: `var(${cat.cssVar})` }} />
        <div className="px-5 py-5 pl-7">
          <p className="flex flex-wrap items-center gap-x-3 text-[0.95rem] text-ink-3">
            <span className="font-semibold text-ink-2">{allDone ? "เรียนครบทุกสัปดาห์แล้ว" : `สัปดาห์ปัจจุบัน: สัปดาห์ที่ ${d.currentWeek}`}</span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: `var(${cat.cssVar})` }} />
              {cat.label}
            </span>
          </p>
          <p className="mt-1 text-[1.3rem] font-bold leading-snug text-ink">{m.title}</p>
          <p className="text-ink-2">{m.focus}</p>
          {cur ? (
            <div className="mt-3 max-w-md">
              <div className="mb-1 flex justify-between text-[0.92rem] text-ink-3">
                <span>สัปดาห์นี้</span>
                <span className="readout">
                  {cur.stagesDone.length}/6 ขั้น · {cur.percent}%
                </span>
              </div>
              <ProgressBar value={cur.percent} label={`ความก้าวหน้าสัปดาห์ที่ ${d.currentWeek}`} color={`var(${cat.cssVar})`} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <LinkButton href={r.href} size="lg">
              {d.resume || cur?.started ? "เรียนต่อ" : "เริ่มเรียน"} สัปดาห์ที่ {r.week}
            </LinkButton>
            <div className="flex items-center gap-3">
              <ProgressRing value={d.overallPercent} size={56} stroke={6} label={`ความก้าวหน้าทั้งรายวิชา ${d.overallPercent}%`} color="var(--copper)">
                <span className="readout text-[0.8rem] text-ink">{d.overallPercent}%</span>
              </ProgressRing>
              <p className="text-[0.95rem] leading-snug text-ink-2">
                ทั้งรายวิชา
                <br />
                <span className="text-ink-3">จบแล้ว {done} จาก {d.weeks.length} สัปดาห์</span>
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="px-5 py-5">
          <p className="text-[0.95rem] text-ink-3">ระดับของฉัน</p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[1.3rem] font-bold text-ink">{g.levelName}</span>
            <span className="text-ink-3">ระดับ {g.level}</span>
          </p>
          <p className="readout mt-1 text-[1.6rem] font-semibold leading-tight text-copper">
            {g.xp.toLocaleString("th-TH")} <span className="text-[1rem] text-ink-3">XP</span>
          </p>
          <ProgressBar
            className="mt-3"
            value={g.xpIntoLevel}
            max={g.xpForNextLevel}
            label={next ? `XP สู่ระดับ ${next.name}` : "ระดับสูงสุดแล้ว"}
            color="var(--copper)"
          />
          <p className="mt-1.5 text-[0.92rem] text-ink-3">
            {next ? (
              <>
                อีก <span className="readout text-ink-2">{Math.max(0, g.xpForNextLevel - g.xpIntoLevel).toLocaleString("th-TH")}</span> XP จะขึ้นเป็น “{next.name}”
              </>
            ) : (
              "ถึงระดับสูงสุดของรายวิชาแล้ว"
            )}
          </p>
          <p className="mt-3 text-[0.9rem] text-ink-3">ได้ XP จากการตอบถูก ทำภารกิจห้องทดลอง ผ่านแบบทดสอบ และเรียนจบสัปดาห์ ไม่นับเวลาที่เปิดหน้าไว้</p>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 18-week status grid
// ---------------------------------------------------------------------------

function weekState(w: WeekStatus) {
  if (w.completed) return { label: "เรียนจบแล้ว", icon: <CheckCircle2 className="size-4" aria-hidden />, cls: "text-ok" };
  if (!w.unlocked) return { label: "ยังล็อกอยู่", icon: <Lock className="size-4" aria-hidden />, cls: "text-ink-3" };
  if (w.started) return { label: "กำลังเรียน", icon: <CircleDashed className="size-4" aria-hidden />, cls: "text-cobalt-ink" };
  return { label: "พร้อมเริ่ม", icon: <CircleDashed className="size-4" aria-hidden />, cls: "text-ink-2" };
}

function WeekGrid({ weeks, current }: { weeks: WeekStatus[]; current: number }) {
  return (
    <section aria-labelledby="weeks-h">
      <h2 id="weeks-h" className="mb-1 text-[1.15rem] font-semibold text-ink">
        สถานะรายสัปดาห์
      </h2>
      <p className="mb-3 text-[0.95rem] text-ink-3">แต่ละสัปดาห์มี 6 ขั้น ผ่านแบบทดสอบตามเกณฑ์เพื่อปลดล็อกสัปดาห์ถัดไป</p>
      <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
        {weeks.map((w) => {
          const m = weekMeta[w.week - 1];
          const color = `var(${categoryInfo[m.category].cssVar})`;
          const s = weekState(w);
          const isCur = w.week === current;
          const body = (
            <>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={cn("readout grid size-10 shrink-0 place-items-center rounded-full border-[3px] font-semibold", w.completed ? "text-panel" : "text-ink", !w.unlocked && "border-dashed")}
                  style={{ borderColor: color, background: w.completed ? color : undefined }}
                >
                  {w.week}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.88rem] text-ink-3">
                    สัปดาห์ที่ {w.week}
                    {isCur ? <span className="ml-2 rounded-sm bg-cobalt-soft px-1.5 font-semibold text-cobalt-ink">ปัจจุบัน</span> : null}
                  </p>
                  <p className="line-clamp-2 font-semibold leading-snug text-ink">{m.title}</p>
                </div>
              </div>
              <p className={cn("mt-2 inline-flex items-center gap-1.5 text-[0.92rem] font-semibold", s.cls)}>
                {s.icon}
                {s.label}
              </p>
              {!w.unlocked ? (
                <p className="text-[0.9rem] text-ink-2">{w.lockReason ?? "ทำสัปดาห์ก่อนหน้าให้ผ่านเกณฑ์ก่อน"}</p>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.92rem] text-ink-2">
                  <span className="inline-flex items-center gap-2">
                    <StageTicks done={w.stagesDone} color={color} />
                    <span className="readout">{w.stagesDone.length}/6 ขั้น</span>
                  </span>
                  <span>
                    แบบทดสอบ <span className="readout font-semibold text-ink">{w.quizBestPercent == null ? "–" : `${Math.round(w.quizBestPercent)}%`}</span>
                  </span>
                </div>
              )}
            </>
          );
          return (
            <li key={w.week} className={cn("bg-panel", isCur && "relative z-[1] shadow-[inset_0_0_0_2px_var(--cobalt)]")}>
              {w.unlocked ? (
                <Link href={`/learn/${w.week}`} className="block h-full px-4 py-3 hover:bg-panel-2" aria-current={isCur ? "step" : undefined}>
                  {body}
                </Link>
              ) : (
                <div className="h-full px-4 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StageTicks({ done, color }: { done: string[]; color: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`ผ่านแล้ว ${done.length} จาก 6 ขั้น: ${stages.filter((s) => done.includes(s.key)).map((s) => s.label).join(" ") || "ยังไม่มี"}`}>
      {stages.map((s) => {
        const ok = done.includes(s.key);
        return <span key={s.key} className={cn("h-2.5 w-3 rounded-[2px] border", ok ? "border-transparent" : "border-line-strong")} style={{ background: ok ? color : undefined }} />;
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

const assignmentGroups: { status: PendingAssignment["status"]; title: string; hint: string; icon: React.ReactNode }[] = [
  { status: "returned", title: "ครูส่งกลับให้แก้ไข", hint: "เปิดใบงานเพื่ออ่านคำแนะนำของครู แก้ไข แล้วส่งใหม่", icon: <FileWarning className="size-5 text-warn" aria-hidden /> },
  { status: "not-submitted", title: "ต้องส่ง", hint: "ทำใบงานในโรงฝึกงาน แล้วอัปโหลดไฟล์หรือรูปถ่าย", icon: <ClipboardList className="size-5 text-cobalt-ink" aria-hidden /> },
  { status: "submitted", title: "ส่งแล้ว รอครูตรวจ", hint: "ครูจะให้คะแนนตามเกณฑ์ในใบงาน", icon: <FileClock className="size-5 text-info" aria-hidden /> },
  { status: "graded", title: "ได้คะแนนแล้ว", hint: "เปิดใบงานเพื่อดูคะแนนแต่ละเกณฑ์และคำแนะนำ", icon: <FileCheck2 className="size-5 text-ok" aria-hidden /> },
];

function Assignments({ items }: { items: PendingAssignment[] }) {
  return (
    <Panel aria-labelledby="asg-h">
      <div className="border-b border-line px-5 py-4">
        <h2 id="asg-h" className="text-[1.1rem] font-semibold text-ink">
          ใบงาน
        </h2>
        <p className="text-[0.92rem] text-ink-3">ใบงานของสัปดาห์ที่ปลดล็อกแล้ว</p>
      </div>
      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState title="ยังไม่มีใบงานที่ต้องส่ง">เมื่อเรียนถึงสัปดาห์ที่มีใบงานปฏิบัติ ใบงานจะขึ้นที่นี่พร้อมสถานะการส่ง</EmptyState>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {assignmentGroups.map((g) => {
            const list = items.filter((a) => a.status === g.status);
            if (!list.length) return null;
            return (
              <section key={g.status} aria-label={g.title} className="px-5 py-4">
                <h3 className="flex items-center gap-2 font-semibold text-ink">
                  {g.icon}
                  {g.title}
                  <span className="readout text-[0.9rem] font-normal text-ink-3">({list.length})</span>
                </h3>
                <p className="text-[0.9rem] text-ink-3">{g.hint}</p>
                <ul className="mt-2 space-y-1">
                  {list.map((a) => (
                    <li key={a.activityId}>
                      <Link
                        href={`/learn/${a.week}/worksheet/${a.activityId}`}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-sm px-2 py-1.5 -mx-2 hover:bg-panel-2"
                      >
                        <span className="min-w-0">
                          <span className="text-[0.88rem] text-ink-3">สัปดาห์ที่ {a.week} · </span>
                          <span className="font-medium text-cobalt-ink underline-offset-4 hover:underline">{a.title}</span>
                        </span>
                        {a.status === "graded" && a.score != null ? (
                          <span className="readout text-[0.95rem] font-semibold text-ink">
                            {a.score}
                            {a.maxScore ? `/${a.maxScore}` : ""} คะแนน
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Quiz history: pre vs post per week
// ---------------------------------------------------------------------------

function QuizHistory({ history }: { history: StudentOverview["quizHistory"] }) {
  const byWeek = new Map<number, { pre: number | null; post: number | null; postCount: number }>();
  // history is newest first; the pre-test happens once, post keeps the best.
  for (const h of history) {
    const e = byWeek.get(h.week) ?? { pre: null, post: null, postCount: 0 };
    if (h.kind === "pre") e.pre = h.percent;
    else {
      e.post = Math.max(e.post ?? -1, h.percent);
      e.postCount++;
    }
    byWeek.set(h.week, e);
  }
  const rows = [...byWeek.entries()].sort((a, b) => a[0] - b[0]);
  return (
    <Panel aria-labelledby="quiz-h">
      <div className="border-b border-line px-5 py-4">
        <h2 id="quiz-h" className="text-[1.1rem] font-semibold text-ink">
          ผลแบบทดสอบ ก่อนเรียนเทียบหลังเรียน
        </h2>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 text-[0.9rem] text-ink-2" aria-label="คำอธิบายแท่ง">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="ee-bar-pre inline-block h-3 w-5 rounded-[2px] border border-ink-3" />
            ก่อนเรียน (ลายเส้น)
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-5 rounded-[2px] bg-cobalt" />
            หลังเรียน คะแนนสูงสุด (ทึบ)
          </li>
        </ul>
      </div>
      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState title="ยังไม่มีผลแบบทดสอบ">เริ่มสัปดาห์แรกด้วยแบบทดสอบก่อนเรียน 5 ข้อ แล้วเทียบกับแบบทดสอบหลังเรียนเพื่อดูว่าเข้าใจมากขึ้นเท่าไร</EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map(([week, e]) => {
            const gain = e.pre != null && e.post != null ? Math.round(e.post - e.pre) : null;
            return (
              <li key={week} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 px-5 py-3">
                <div>
                  <p className="font-semibold text-ink">สัปดาห์ {week}</p>
                  {gain != null ? (
                    <p className={cn("inline-flex items-center gap-1 text-[0.85rem] font-semibold", gain > 0 ? "text-ok" : gain < 0 ? "text-danger" : "text-ink-3")}>
                      {gain > 0 ? <TrendingUp className="size-4" aria-hidden /> : gain < 0 ? <TrendingDown className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
                      <span className="readout">
                        {gain > 0 ? "+" : ""}
                        {gain}
                      </span>
                      <span className="sr-only">คะแนนเปลี่ยน {gain} จุดร้อยละ</span>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <QuizBar kind="pre" value={e.pre} />
                  <QuizBar kind="post" value={e.post} note={e.postCount > 1 ? `ทำ ${e.postCount} ครั้ง` : undefined} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function QuizBar({ kind, value, note }: { kind: "pre" | "post"; value: number | null; note?: string }) {
  const label = kind === "pre" ? "ก่อนเรียน" : "หลังเรียน";
  const v = value == null ? null : Math.round(value);
  return (
    <div className="grid grid-cols-[4.6rem_minmax(0,1fr)_3.4rem] items-center gap-2 text-[0.88rem]">
      <span className="text-ink-2">{label}</span>
      <span aria-hidden className="relative h-3.5 overflow-hidden rounded-[3px] bg-panel-2">
        {v != null ? (
          <span
            className={cn("absolute inset-y-0 left-0 rounded-[3px]", kind === "pre" ? "ee-bar-pre border border-ink-3" : "bg-cobalt")}
            style={{ width: `${Math.max(2, v)}%` }}
          />
        ) : null}
        {/* 60 % reference tick */}
        <span className="absolute inset-y-0 left-[60%] w-px bg-ink-3/60" />
      </span>
      <span className="readout text-right font-semibold text-ink">
        {v == null ? <span className="font-normal text-ink-3">ยังไม่ทำ</span> : `${v}%`}
        {note ? <span className="sr-only"> ({note})</span> : null}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

function Achievements({ d }: { d: StudentOverview }) {
  const earned = new Map(d.gamification.achievements.map((a) => [a.code, a]));
  const got = ACHIEVEMENTS.filter((a) => earned.has(a.code));
  const todo = ACHIEVEMENTS.filter((a) => !earned.has(a.code));
  return (
    <Panel aria-labelledby="ach-h">
      <PanelHeader title={<span id="ach-h">เหรียญรางวัล</span>} description={`ได้แล้ว ${got.length} จาก ${ACHIEVEMENTS.length} เหรียญ`} />
      <div className="grid gap-6 px-5 py-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold text-ink">ได้รับแล้ว</h3>
          {got.length === 0 ? (
            <p className="rounded-md border border-dashed border-line-strong px-4 py-4 text-ink-3">
              ยังไม่มีเหรียญ เรียนสัปดาห์ที่ 1 ให้ครบทุกขั้นเพื่อรับเหรียญ “{ACHIEVEMENTS[0].title}”
            </p>
          ) : (
            <ul className="space-y-2">
              {got.map((a) => (
                <li key={a.code} className="flex gap-3 rounded-md border border-copper/40 bg-copper-soft px-3 py-2.5">
                  <Award className="mt-1 size-6 shrink-0 text-copper" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{a.title}</p>
                    <p className="text-[0.92rem] text-ink-2">{a.description}</p>
                    <p className="text-[0.85rem] text-ink-3">ได้รับเมื่อ {fmtDate(earned.get(a.code)?.earnedAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-ink">ยังไม่ได้รับ</h3>
          {todo.length === 0 ? (
            <p className="text-ink-2">ได้ครบทุกเหรียญแล้ว</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {todo.map((a) => (
                <li key={a.code} className="flex gap-3 px-3 py-2.5">
                  <Lock className="mt-1 size-5 shrink-0 text-ink-3" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-2">
                      {a.title}
                      <span className="sr-only"> (ยังไม่ได้รับ)</span>
                    </p>
                    <p className="text-[0.92rem] text-ink-3">วิธีรับ: {a.how}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Recent history, certificate, classrooms
// ---------------------------------------------------------------------------

function Recent({ items, currentWeek }: { items: StudentOverview["recent"]; currentWeek: number }) {
  return (
    <Panel aria-labelledby="recent-h">
      <PanelHeader title={<span id="recent-h" className="inline-flex items-center gap-2"><History className="size-5 text-ink-3" aria-hidden />ประวัติการเรียนล่าสุด</span>} />
      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState title="ยังไม่มีประวัติการเรียน" action={<LinkButton href={`/learn/${currentWeek}`}>เริ่มเรียนสัปดาห์ที่ {currentWeek}</LinkButton>}>
            ทุกครั้งที่เรียนจบหัวข้อ ผ่านขั้น หรือทำแบบทดสอบ ระบบจะบันทึกไว้ที่นี่
          </EmptyState>
        </div>
      ) : (
        <ol className="px-5 py-4">
          {items.map((r, i) => (
            <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
              {i < items.length - 1 ? <span aria-hidden className="absolute bottom-0 left-[5px] top-4 w-0.5 bg-copper/35" /> : null}
              <span aria-hidden className="mt-2 size-3 shrink-0 rounded-full border-2 border-copper bg-panel" />
              <div className="min-w-0">
                <p className="text-ink-2">{r.text}</p>
                <p className="text-[0.85rem] text-ink-3">
                  <time dateTime={r.at}>{fmtDateTime(r.at)}</time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Certificate({ d }: { d: StudentOverview }) {
  const done = d.weeks.filter((w) => w.completed).length;
  return (
    <Panel aria-labelledby="cert-h">
      <div className="px-5 py-4">
        <h2 id="cert-h" className="flex items-center gap-2 text-[1.1rem] font-semibold text-ink">
          <BadgeCheck className={cn("size-5", d.certificate ? "text-ok" : "text-ink-3")} aria-hidden />
          ใบประกาศนียบัตร
        </h2>
        {d.certificate ? (
          <>
            <p className="mt-1 text-ink-2">ครูออกใบประกาศนียบัตรให้แล้วเมื่อ {fmtDate(d.certificate.issuedAt)} เปิดเพื่อพิมพ์หรือส่งลิงก์ให้ผู้อื่นตรวจสอบได้</p>
            <p className="readout mt-1 text-ink">รหัส {d.certificate.code}</p>
            <LinkButton href={`/certificate/${d.certificate.code}`} className="mt-3" variant="secondary">
              เปิดใบประกาศนียบัตร
            </LinkButton>
          </>
        ) : (
          <>
            <p className="mt-1 text-ink-2">เรียนจบครบ 18 สัปดาห์และผ่านการประเมินสมรรถนะปลายภาคกับครู แล้วจะได้รับใบประกาศนียบัตร</p>
            <ProgressBar className="mt-3" value={done} max={18} label="จำนวนสัปดาห์ที่เรียนจบ" color="var(--ok)" />
            <p className="readout mt-1 text-[0.9rem] text-ink-3">จบแล้ว {done}/18 สัปดาห์</p>
          </>
        )}
      </div>
    </Panel>
  );
}

function Classrooms({ items }: { items: StudentOverview["classrooms"] }) {
  return (
    <Panel aria-labelledby="class-h">
      <div className="px-5 py-4">
        <h2 id="class-h" className="flex items-center gap-2 text-[1.1rem] font-semibold text-ink">
          <School className="size-5 text-ink-3" aria-hidden />
          ห้องเรียนของฉัน
        </h2>
        {items.length === 0 ? (
          <p className="mt-1 text-ink-2">ยังไม่ได้อยู่ในห้องเรียนใด เรียนได้ตามปกติ แต่ครูจะยังไม่เห็นผลการเรียน แจ้งครูผู้สอนให้เพิ่มชื่อเข้าห้องเรียน</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {items.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold text-ink">{c.name}</span>
                <span className="text-[0.92rem] text-ink-3">ภาคเรียน {c.term}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="กำลังโหลดแดชบอร์ด">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="ee-skeleton h-60 rounded-md" />
        <div className="ee-skeleton h-60 rounded-md" />
      </div>
      <div className="ee-skeleton aspect-[3/1] rounded-md" />
      <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="ee-skeleton h-28 rounded-sm" />
        ))}
      </div>
    </div>
  );
}
