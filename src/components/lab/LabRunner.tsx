"use client";
/**
 * Generic lab runner: the lab component (lazy) next to the week's task list.
 * State tasks are checked with `lab.checks[check].fn(latestState, params)`.
 */
import { useCallback, useId, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, FlaskConical, Info, Lightbulb, LoaderCircle, NotebookPen, RotateCcw, Save, Target, Trash2 } from "lucide-react";
import type { LabTask, LabTaskLevel, WeekLab } from "@/content/types";
import type { ActionResult, LabNote } from "@/server/contracts";
import type { LabModule } from "@/labs/types";
import { cn } from "@/lib/cn";
import { Button, Input, Textarea } from "@/components/ui";
import { Disclosure } from "@/components/ui/client";
import { Markdown } from "@/components/learn/Markdown";
import { ChoiceList } from "@/components/learn/interactions/Mcq";
import { Explanation, Mark } from "@/components/learn/interactions/shell";
import { checkNumeric, gradeMcq } from "@/components/learn/lib/grading";
import { LabFrame } from "./useLab";

export type TaskReporter = (taskId: string, correct: boolean, value?: string) => Promise<ActionResult<{ correct: boolean; xpAwarded: number }>>;

/** Mission tiers (LAB_SPEC): every task carries one; untagged tasks are listed as tier 2. */
export const LEVEL_INFO: Record<LabTaskLevel, { title: string; hint: string }> = {
  1: { title: "ระดับ 1 · เรียนรู้เครื่องมือ", hint: "รู้จักปุ่ม ค่าที่ปรับได้ และการอ่านค่า" },
  2: { title: "ระดับ 2 · ทดลองตามขั้นตอน", hint: "ตั้งค่าตามที่กำหนดแล้วสังเกตผล" },
  3: { title: "ระดับ 3 · แก้โจทย์ที่กำหนด", hint: "คำนวณหรือหาค่าที่ทำให้ได้ผลตามโจทย์" },
  4: { title: "ระดับ 4 · Challenge Mission", hint: "วิเคราะห์ วินิจฉัย หรือออกแบบด้วยตนเอง" },
};
const levelOf = (t: LabTask): LabTaskLevel => t.level ?? 2;

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
};

/** "สมุดบันทึกผลการทดลอง": snapshots of the lab's readouts, saved with the week. */
function Notebook({
  lab,
  getState,
  notes,
  onChange,
  save,
}: {
  lab: LabModule | null;
  getState: () => unknown;
  notes: LabNote[];
  onChange: (n: LabNote[]) => void;
  save: (n: LabNote[]) => Promise<ActionResult<null>>;
}) {
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const canRecord = !!lab?.readouts;
  const columns = Array.from(new Set(notes.flatMap((n) => n.values.map((v) => v.k))));

  const persist = async (next: LabNote[]) => {
    onChange(next);
    setBusy(true);
    const r = await save(next);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "บันทึกแล้ว" } : { ok: false, text: r.error });
  };
  const record = () => {
    const st = getState();
    if (!lab?.readouts || st === undefined) {
      setMsg({ ok: false, text: "ยังอ่านค่าจากห้องทดลองไม่ได้ ลองปรับค่าในห้องทดลองก่อน" });
      return;
    }
    let values: { k: string; v: string }[] = [];
    try {
      values = lab.readouts(st).slice(0, 16).map((r) => ({ k: r.label.slice(0, 60), v: r.value.slice(0, 60) }));
    } catch {
      setMsg({ ok: false, text: "อ่านค่าไม่สำเร็จ ลองอีกครั้ง" });
      return;
    }
    if (notes.length >= 60) {
      setMsg({ ok: false, text: "สมุดบันทึกเต็ม (60 แถว) ลบแถวที่ไม่ใช้ก่อน" });
      return;
    }
    const row: LabNote = { at: new Date().toISOString(), label: label.trim().slice(0, 120) || `ครั้งที่ ${notes.length + 1}`, values };
    setLabel("");
    void persist([...notes, row]);
  };

  return (
    <section aria-labelledby="nb-h" className="rounded-md border border-line bg-panel p-5">
      <h2 id="nb-h" className="flex items-center gap-2 text-[1.15rem] font-semibold text-ink">
        <NotebookPen className="size-5 text-copper" aria-hidden />
        สมุดบันทึกผลการทดลอง
      </h2>
      <p className="mb-3 text-ink-3">ตั้งค่าในห้องทดลอง แล้วกด “บันทึกค่าตอนนี้” เพื่อเก็บค่าที่อ่านได้เป็นตาราง ใช้เปรียบเทียบผลหลายครั้งและตอบคำถามสะท้อนคิด</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor={`${id}-label`} className="mb-1 block text-[0.92rem] font-medium text-ink-2">
            ชื่อการทดลอง (ไม่บังคับ)
          </label>
          <Input id={`${id}-label`} value={label} maxLength={120} placeholder={`เช่น ครั้งที่ ${notes.length + 1}`} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <Button onClick={record} disabled={!canRecord || busy}>
          <Save className="size-4" aria-hidden />
          บันทึกค่าตอนนี้
        </Button>
        <span aria-live="polite" className={cn("text-[0.95rem]", msg?.ok ? "text-ok" : "text-danger")}>
          {msg?.text}
        </span>
      </div>
      {!canRecord ? <p className="mt-2 text-[0.9rem] text-ink-3">ห้องทดลองนี้ยังไม่ส่งค่าให้สมุดบันทึก</p> : null}
      {notes.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[0.95rem]">
            <caption className="sr-only">ค่าที่บันทึกไว้</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-2">
                <th className="py-1.5 pr-3 font-semibold">ครั้ง</th>
                {columns.map((c) => (
                  <th key={c} className="py-1.5 pr-3 font-semibold">
                    {c}
                  </th>
                ))}
                <th className="py-1.5 pr-3 font-semibold">เวลา</th>
                <th className="sr-only">ลบ</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n, i) => (
                <tr key={`${n.at}-${i}`} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-ink">{n.label}</td>
                  {columns.map((c) => (
                    <td key={c} className="readout py-1.5 pr-3 text-ink">
                      {n.values.find((v) => v.k === c)?.v ?? "—"}
                    </td>
                  ))}
                  <td className="readout py-1.5 pr-3 text-ink-3">{fmtTime(n.at)}</td>
                  <td className="py-1.5">
                    <button type="button" aria-label={`ลบแถว ${n.label}`} disabled={busy} onClick={() => void persist(notes.filter((_, j) => j !== i))} className="rounded-sm p-1 text-ink-3 hover:bg-panel-2 hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function TaskItem({
  task,
  n,
  done,
  getState,
  lab,
  report,
}: {
  task: LabTask;
  n: number;
  done: boolean;
  getState: () => unknown;
  lab: LabModule | null;
  report: TaskReporter;
}) {
  const [value, setValue] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "busy" | "correct" | "wrong">(done ? "correct" : "idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const inputId = useId();
  const name = useId();

  const submit = async (correct: boolean, v?: string) => {
    setStatus("busy");
    const r = await report(task.id, correct, v);
    if (!r.ok) {
      setStatus("idle");
      setMsg(r.error);
      return;
    }
    const ok = r.data.correct;
    setStatus(ok ? "correct" : "wrong");
    if (!ok) setTries((t) => t + 1);
    setMsg(null);
  };

  const check = () => {
    if (task.kind === "numeric") {
      const ok = checkNumeric(value, task.answer, task.tolerance ?? 0.03, task.absTolerance ?? 0);
      void submit(ok, value.trim());
    } else if (task.kind === "mcq") {
      void submit(gradeMcq(task.options, sel).correct, sel.join(","));
    } else {
      const c = lab?.checks[task.check];
      if (!c) {
        setMsg("ห้องทดลองนี้ยังตรวจภารกิจนี้อัตโนมัติไม่ได้ แจ้งครูผู้สอน");
        return;
      }
      let ok = false;
      try {
        const st = getState();
        ok = st !== undefined && c.fn(st, task.params ?? {});
      } catch (e) {
        console.error(e);
      }
      void submit(ok, ok ? "ok" : "not-met");
    }
  };

  const correct = status === "correct";
  const hint = "hint" in task ? task.hint : undefined;
  return (
    <li data-task-id={task.id} className={cn("rounded-md border bg-panel p-4", correct ? "border-ok/50" : "border-line")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "readout grid size-8 shrink-0 place-items-center rounded-full border-2 text-[0.9rem] font-semibold",
            correct ? "border-ok bg-ok text-white dark:text-paper" : "border-copper text-copper",
          )}
          aria-hidden
        >
          {correct ? <CheckCircle2 className="size-4" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="sr-only">ภารกิจที่ {n}{correct ? " (ทำสำเร็จแล้ว)" : ""}</p>
          <Markdown className="font-medium text-ink [&_p:last-child]:mb-0">{task.prompt}</Markdown>
          {!correct ? (
            <div className="mt-3">
              {task.kind === "numeric" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={inputId} className="sr-only">
                    คำตอบ{task.unit ? ` (${task.unit})` : ""}
                  </label>
                  <span className="flex items-stretch">
                    <input
                      id={inputId}
                      inputMode="decimal"
                      autoComplete="off"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && value.trim() && check()}
                      className={cn("readout h-11 w-36 border border-line-strong bg-panel px-3 text-right", task.unit ? "rounded-l-sm border-r-0" : "rounded-sm")}
                    />
                    {task.unit ? <span className="grid h-11 place-items-center rounded-r-sm border border-line-strong bg-panel-2 px-3 text-ink-2">{task.unit}</span> : null}
                  </span>
                  <Button onClick={check} disabled={!value.trim() || status === "busy"}>
                    {status === "busy" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
                    ตรวจคำตอบ
                  </Button>
                </div>
              ) : task.kind === "mcq" ? (
                <>
                  <ChoiceList options={task.options} selected={sel} onChange={(s) => { setSel(s); if (status === "wrong") setStatus("idle"); }} locked={status === "busy"} graded={status === "wrong"} name={name} legend="ตัวเลือก" />
                  <Button className="mt-3" onClick={check} disabled={!sel.length || status === "busy"}>
                    ตรวจคำตอบ
                  </Button>
                </>
              ) : (
                <Button onClick={check} disabled={status === "busy" || !lab} variant="secondary">
                  {status === "busy" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ClipboardCheck className="size-4" aria-hidden />}
                  ตรวจสอบจากห้องทดลอง
                </Button>
              )}
            </div>
          ) : null}
          <div aria-live="polite" className="mt-2">
            {status === "wrong" ? (
              <p className="text-[0.95rem] text-ink-2">
                <Mark ok={false} badText="ยังไม่ถูก" className="mr-2" />
                {task.kind === "state" ? "ค่าที่ตั้งในห้องทดลองยังไม่ตรงตามภารกิจ ปรับค่าแล้วกดตรวจสอบอีกครั้ง" : task.kind === "numeric" ? "ตัวเลขยังไม่ตรง อ่านค่าจากห้องทดลองหรือคำนวณใหม่ แล้วตรวจหน่วย" : "อ่านเหตุผลใต้ตัวเลือก แล้วลองอีกครั้ง"}
              </p>
            ) : null}
            {msg ? <p className="text-[0.95rem] text-danger">{msg}</p> : null}
            {status === "wrong" && hint ? (
              <p className="mt-1 flex items-start gap-1.5 text-[0.95rem] text-ink-2">
                <Lightbulb className="mt-1 size-4 shrink-0 text-warn" aria-hidden />
                <span>
                  <span className="font-semibold">คำใบ้: </span>
                  <Markdown inline>{hint}</Markdown>
                </span>
              </p>
            ) : null}
            {correct ? <Explanation md={task.explanation} title="ทำสำเร็จ" /> : status === "wrong" && tries >= 3 ? <Explanation md={task.explanation} title="คำอธิบาย (ยังต้องทำให้ถูกเพื่อผ่านภารกิจ)" /> : null}
          </div>
        </div>
      </div>
    </li>
  );
}

export function LabRunner({
  weekLab,
  done,
  report,
  reflection,
  saveReflection,
  notes: initialNotes = [],
  saveNotes,
}: {
  weekLab: WeekLab;
  done: readonly string[];
  report: TaskReporter;
  reflection: string[] | null;
  saveReflection: (answers: string[]) => Promise<ActionResult<null>>;
  notes?: LabNote[];
  saveNotes?: (notes: LabNote[]) => Promise<ActionResult<null>>;
}) {
  const [notes, setNotes] = useState<LabNote[]>(initialNotes);
  const [resetToken, setResetToken] = useState(0);
  const tiers = ([1, 2, 3, 4] as LabTaskLevel[]).map((lv) => ({ lv, tasks: weekLab.tasks.filter((t) => levelOf(t) === lv) })).filter((g) => g.tasks.length);
  const showTiers = weekLab.tasks.some((t) => t.level);
  const stateRef = useRef<unknown>(undefined);
  const [lab, setLab] = useState<LabModule | null>(null);
  const onState = useCallback((s: unknown) => {
    stateRef.current = s;
  }, []);
  const onModule = useCallback((m: LabModule) => setLab(m), []);
  const getState = useCallback(() => stateRef.current, []);
  const [answers, setAnswers] = useState<string[]>(() => (weekLab.reflection ?? []).map((_, i) => reflection?.[i] ?? ""));
  const [saveState, setSaveState] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const doneCount = weekLab.tasks.filter((t) => done.includes(t.id)).length;
  const assumptions = [...(lab?.assumptions ?? []), ...weekLab.assumptions];

  return (
    <div className="space-y-6">
      <section aria-labelledby="lab-h" className="rounded-md border border-line bg-panel p-5">
        <h2 id="lab-h" className="flex items-center gap-2 text-[1.3rem] font-bold text-ink">
          <FlaskConical className="size-6 text-copper" aria-hidden />
          {weekLab.title || lab?.title || "ห้องทดลองเสมือน"}
        </h2>
        <div className="mt-2 flex items-start gap-2 text-ink-2">
          <Target className="mt-1 size-4 shrink-0 text-cobalt" aria-hidden />
          <Markdown className="[&_p:last-child]:mb-0">{weekLab.objective}</Markdown>
        </div>
        {weekLab.instructions.length ? (
          <div className="mt-4 rounded-sm bg-panel-2 px-4 py-3">
            <p className="mb-1 font-semibold text-ink">วิธีใช้ห้องทดลอง</p>
            <ol className="list-decimal space-y-1 pl-5 text-ink-2">
              {weekLab.instructions.map((s, i) => (
                <li key={i}>
                  <Markdown inline>{s}</Markdown>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <LabFrame id={weekLab.lab} preset={weekLab.preset} onState={onState} onModule={onModule} resetToken={resetToken} />
      <div className="-mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setResetToken((t) => t + 1)}>
          <RotateCcw className="size-4" aria-hidden />
          เริ่มต้นใหม่ (ค่าตั้งต้นของสัปดาห์นี้)
        </Button>
      </div>

      {assumptions.length ? (
        <div className="rounded-md border border-line bg-panel">
          <Disclosure summary="ข้อสมมติและขอบเขตความแม่นยำของแบบจำลอง" icon={<Info className="size-5 text-info" aria-hidden />}>
            <ul className="list-disc space-y-1 px-5 pb-4 pl-10 text-[0.95rem] text-ink-2">
              {assumptions.map((a, i) => (
                <li key={i}>
                  <Markdown inline>{a}</Markdown>
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      ) : null}

      <section aria-labelledby="tasks-h">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tasks-h" className="text-[1.2rem] font-bold text-ink">
            ภารกิจในห้องทดลอง
          </h2>
          <p className="readout text-ink-2">
            สำเร็จ {doneCount}/{weekLab.tasks.length}
          </p>
        </div>
        {weekLab.tasks.length && showTiers ? (
          <div className="space-y-5">
            {tiers.map((g) => (
              <div key={g.lv}>
                <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[1.02rem] font-semibold text-ink">
                  {LEVEL_INFO[g.lv].title}
                  <span className="text-[0.9rem] font-normal text-ink-3">{LEVEL_INFO[g.lv].hint}</span>
                  <span className="readout ml-auto text-[0.9rem] font-normal text-ink-3">
                    {g.tasks.filter((t) => done.includes(t.id)).length}/{g.tasks.length}
                  </span>
                </h3>
                <ol className="space-y-3">
                  {g.tasks.map((t) => (
                    <TaskItem key={t.id} task={t} n={weekLab.tasks.indexOf(t) + 1} done={done.includes(t.id)} getState={getState} lab={lab} report={report} />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : weekLab.tasks.length ? (
          <ol className="space-y-3">
            {weekLab.tasks.map((t, i) => (
              <TaskItem key={t.id} task={t} n={i + 1} done={done.includes(t.id)} getState={getState} lab={lab} report={report} />
            ))}
          </ol>
        ) : (
          <p className="text-ink-3">ห้องทดลองนี้ยังไม่มีภารกิจ ทดลองปรับค่าได้อย่างอิสระ</p>
        )}
      </section>

      {saveNotes ? <Notebook lab={lab} getState={getState} notes={notes} onChange={setNotes} save={saveNotes} /> : null}

      {weekLab.reflection && weekLab.reflection.length ? (
        <section aria-labelledby="refl-h" className="rounded-md border border-line bg-panel p-5">
          <h2 id="refl-h" className="text-[1.15rem] font-semibold text-ink">
            คำถามสะท้อนคิด
          </h2>
          <p className="mb-3 text-ink-3">เขียนคำตอบด้วยคำพูดของตัวเอง ครูจะอ่านและให้ข้อเสนอแนะ (ไม่ตรวจอัตโนมัติ)</p>
          <div className="space-y-4">
            {weekLab.reflection.map((q, i) => (
              <div key={i}>
                <label htmlFor={`refl-${i}`} className="mb-1 block font-medium text-ink">
                  <span className="readout mr-1 text-ink-3">{i + 1}.</span>
                  <Markdown inline>{q}</Markdown>
                </label>
                <Textarea
                  id={`refl-${i}`}
                  value={answers[i] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
                    setSaveState(null);
                  }}
                  rows={3}
                  maxLength={2000}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              disabled={saving || answers.every((a) => !a.trim())}
              onClick={async () => {
                setSaving(true);
                const r = await saveReflection(answers);
                setSaving(false);
                setSaveState(r.ok ? { ok: true, msg: "บันทึกคำตอบแล้ว" } : { ok: false, msg: r.error });
              }}
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
              บันทึกคำตอบ
            </Button>
            <span aria-live="polite" className={cn("text-[0.95rem]", saveState?.ok ? "text-ok" : "text-danger")}>
              {saveState?.msg}
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

