"use client";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { LabProps } from "../types";
import {
  AssumptionsPanel,
  ControlGroup,
  LabButton,
  LabSelect,
  LabShell,
  Readout,
  Segmented,
  SimNotice,
} from "../shared/ui";
import {
  ALL_COLOURS,
  COLOURS,
  MAKE_TARGETS,
  bandRoles,
  colourMeaning,
  coloursFor,
  convertBands,
  decodeSmd,
  explainBands,
  formatOhm,
  formatOhmSig,
  formatPercent,
  gradeQuiz,
  parseResistance,
  randomResistor,
  randomTarget,
  roleLabelTh,
  summarise,
  valueBands,
  type BandCount,
  type BandRole,
  type ColorCodeState,
  type ColourName,
  type Mode,
  type QuizItem,
} from "./model";
import { ResistorStage, SMD_KIND_TH, SmdStage, resistorCaption, smdCaption } from "./Stage";
import { ASSUMPTIONS, initialFor } from "./presets";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "read", label: "อ่านค่า" },
  { value: "make", label: "ตั้งแถบ" },
  { value: "quiz", label: "แบบทดสอบ" },
  { value: "smd", label: "SMD" },
];

const TOL_CHOICES = [20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05];
const SMD_EXAMPLES = ["472", "100", "4R7", "1002", "01C", "68X"];

type QuizFeedback = { correct: boolean; valueOk: boolean; tolOk: boolean; explain: string } | null;

export default function ColorCodeLab({ preset = "default", onState, compact = false }: LabProps) {
  const init = useMemo(() => initialFor(preset), [preset]);
  const [mode, setMode] = useState<Mode>(init.mode);
  const [bandCount, setBandCount] = useState<BandCount>(init.bandCount);
  const [bands, setBands] = useState<ColourName[]>(init.bands);
  const [target, setTarget] = useState<number>(init.target);
  const [showAnswer, setShowAnswer] = useState(false);
  const [smdCode, setSmdCode] = useState(init.smdCode);
  const [activeBand, setActiveBand] = useState<number | null>(null);
  const [quizItem, setQuizItem] = useState<QuizItem | null>(null);
  const [quizValue, setQuizValue] = useState("");
  const [quizTol, setQuizTol] = useState("5");
  const [feedback, setFeedback] = useState<QuizFeedback>(null);
  const [stats, setStats] = useState({ correct: 0, attempts: 0, streak: 0 });
  const [best, setBest] = useState(0);

  // Reset when the preset changes (not on first mount — state is already initialised).
  const firstPreset = useRef(preset);
  useEffect(() => {
    if (firstPreset.current === preset) return;
    firstPreset.current = preset;
    setMode(init.mode);
    setBandCount(init.bandCount);
    setBands(init.bands);
    setTarget(init.target);
    setSmdCode(init.smdCode);
    setShowAnswer(false);
    setQuizItem(null);
    setFeedback(null);
  }, [preset, init]);

  // Quiz draws happen in an effect / handlers only (never during render).
  useEffect(() => {
    if (mode !== "quiz" || quizItem) return;
    const t = setTimeout(() => setQuizItem((q) => q ?? randomResistor()), 0);
    return () => clearTimeout(t);
  }, [mode, quizItem]);

  const { decoded, series, isStandard } = useMemo(() => summarise(bands, bandCount), [bands, bandCount]);
  const smd = useMemo(() => decodeSmd(smdCode), [smdCode]);
  const matched = decoded.ok && Math.abs(decoded.value - target) <= Math.abs(target) * 1e-6;

  // ---- observable state (debounced) ----
  const state: ColorCodeState = useMemo(
    () => ({
      mode,
      bandCount,
      bands: [...bands],
      value: decoded.ok ? decoded.value : NaN,
      tolerance: decoded.ok ? decoded.tolerance : NaN,
      tempco: decoded.tempco,
      isStandard,
      series,
      quiz: stats,
      smd: smd.ok ? { code: smd.code, value: smd.value } : undefined,
      ...(mode === "make" ? { target, matched } : {}),
    }),
    [mode, bandCount, bands, decoded, isStandard, series, stats, smd, target, matched],
  );
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => onStateRef.current?.(state), 200);
    return () => clearTimeout(t);
  }, [state]);

  // ---- handlers ----
  const changeBandCount = (n: BandCount) => {
    if (n === bandCount) return;
    setBands(convertBands(bands, bandCount, n));
    setBandCount(n);
    setActiveBand(null);
  };
  const setBand = (i: number, c: ColourName) => setBands((b) => b.map((x, j) => (j === i ? c : x)));
  const newTarget = () => {
    setTarget(randomTarget(bandCount));
    setShowAnswer(false);
  };
  const checkQuiz = () => {
    if (!quizItem || feedback) return;
    const g = gradeQuiz(quizItem, parseResistance(quizValue), Number(quizTol));
    const streak = g.correct ? stats.streak + 1 : 0;
    setStats({ correct: stats.correct + (g.correct ? 1 : 0), attempts: stats.attempts + 1, streak });
    setBest((b) => Math.max(b, streak));
    setFeedback({ ...g, explain: explainBands(quizItem.bands, quizItem.bandCount) });
  };
  const nextQuiz = () => {
    setQuizItem((prev) => {
      let q = randomResistor();
      for (let k = 0; k < 5 && prev && q.value === prev.value && q.tolerance === prev.tolerance; k++) q = randomResistor();
      return q;
    });
    setQuizValue("");
    setFeedback(null);
  };
  const skipQuiz = () => {
    setStats((s) => ({ ...s, attempts: s.attempts + 1, streak: 0 }));
    nextQuiz();
  };

  // ---- stage ----
  let stage: ReactNode;
  let stageLabel: string;
  if (mode === "smd") {
    const cap = smdCaption(smdCode);
    stage = <SmdStage code={smdCode} title={cap.title} subtitle={cap.subtitle} />;
    stageLabel = `ชิปตัวต้านทาน SMD พิมพ์รหัส ${smdCode || "ว่าง"} ${smd.ok ? `ค่า ${formatOhm(smd.value)}` : "อ่านไม่ได้"}`;
  } else if (mode === "quiz") {
    if (quizItem) {
      const cap = resistorCaption(quizItem.bands, quizItem.bandCount);
      stage = (
        <ResistorStage
          idSuffix="quiz"
          bandCount={quizItem.bandCount}
          bands={quizItem.bands}
          title={feedback ? cap.title : "ค่า = ? Ω  ±?%"}
          subtitle={feedback ? cap.subtitle : "อ่านแถบสีแล้วพิมพ์ค่าและเลือกค่าผิดพลาด"}
        />
      );
      stageLabel = `ตัวต้านทาน ${quizItem.bandCount} แถบ สี ${quizItem.bands.map((c) => COLOURS[c].th).join(" ")}`;
    } else {
      stage = <div className="grid h-40 place-items-center text-ink-3">กำลังสุ่มตัวต้านทาน…</div>;
      stageLabel = "กำลังสุ่มตัวต้านทาน";
    }
  } else {
    const cap = resistorCaption(bands, bandCount);
    const title = mode === "make" ? `เป้าหมาย ${formatOhm(target)} · ตอนนี้ ${decoded.ok ? formatOhm(decoded.value) : "—"}` : cap.title;
    const subtitle = mode === "make" ? (matched ? "✓ ตรงเป้าหมายแล้ว" : "✗ ยังไม่ตรง — ปรับแถบสี") : cap.subtitle;
    stage = <ResistorStage idSuffix="main" bandCount={bandCount} bands={bands} title={title} subtitle={subtitle} activeBand={activeBand} />;
    stageLabel = `ตัวต้านทาน ${bandCount} แถบ สี ${bands.map((c) => COLOURS[c].th).join(" ")} ${cap.title} ${cap.subtitle}`;
  }

  // ---- controls ----
  const bandEditor = (
    <ControlGroup title="เลือกสีแต่ละแถบ">
      <Segmented
        label="จำนวนแถบ"
        value={String(bandCount) as "4" | "5" | "6"}
        onChange={(v) => changeBandCount(Number(v) as BandCount)}
        options={[
          { value: "4", label: "4 แถบ" },
          { value: "5", label: "5 แถบ" },
          { value: "6", label: "6 แถบ" },
        ]}
        size="sm"
      />
      <BandSelectors bandCount={bandCount} bands={bands} onChange={setBand} onFocusBand={setActiveBand} />
    </ControlGroup>
  );

  const targetOptions = Array.from(new Set([...MAKE_TARGETS, target])).map((v) => ({ value: String(v), label: formatOhm(v) }));
  const answer = valueBands(target, bandCount);

  const controls = (
    <>
      <Segmented label="โหมด" value={mode} onChange={(m) => setMode(m)} options={MODE_OPTIONS} />
      {mode === "read" ? bandEditor : null}
      {mode === "make" ? (
        <>
          <ControlGroup title="ค่าเป้าหมาย">
            <LabSelect
              label="เลือกค่าเป้าหมาย"
              value={String(target)}
              onChange={(v) => {
                setTarget(Number(v));
                setShowAnswer(false);
              }}
              options={targetOptions}
            />
            <div className="flex flex-wrap gap-2">
              <LabButton onClick={newTarget}>สุ่มค่าเป้าหมาย</LabButton>
              <LabButton onClick={() => setShowAnswer((s) => !s)} pressed={showAnswer}>
                {showAnswer ? "ซ่อนเฉลย" : "ดูเฉลย"}
              </LabButton>
            </div>
            {!answer ? (
              <SimNotice tone="info">ค่านี้มีเลขนัยสำคัญ 3 หลัก ต้องใช้ตัวต้านทาน 5 หรือ 6 แถบ</SimNotice>
            ) : showAnswer ? (
              <SimNotice tone="info">
                เฉลย: {answer.map((c, i) => `${COLOURS[c].th} (${colourMeaning(c, bandRoles(bandCount)[i])})`).join(" – ")} แล้วเลือกแถบค่าผิดพลาดตามต้องการ
              </SimNotice>
            ) : null}
          </ControlGroup>
          {bandEditor}
        </>
      ) : null}
      {mode === "quiz" ? (
        <QuizControls
          item={quizItem}
          value={quizValue}
          tol={quizTol}
          feedback={feedback}
          onValue={setQuizValue}
          onTol={setQuizTol}
          onCheck={checkQuiz}
          onNext={nextQuiz}
          onSkip={skipQuiz}
        />
      ) : null}
      {mode === "smd" ? <SmdControls code={smdCode} onCode={setSmdCode} /> : null}
    </>
  );

  // ---- readouts ----
  let readouts: ReactNode;
  if (mode === "smd") {
    readouts = (
      <>
        <Readout label="ค่าความต้านทาน" text={smd.ok ? formatOhm(smd.value) : "—"} tone={smd.ok ? "ok" : "warn"} />
        <Readout label="ชนิดรหัส" text={smd.ok ? SMD_KIND_TH[smd.kind] : "—"} />
        <Readout label="ค่าผิดพลาด (ทั่วไป)" text={smd.ok && smd.tolerance !== undefined ? formatPercent(smd.tolerance) : "ไม่ระบุในรหัส"} />
      </>
    );
  } else if (mode === "quiz") {
    readouts = (
      <>
        <Readout label="ตอบถูก" text={`${stats.correct} / ${stats.attempts}`} />
        <Readout label="ถูกติดต่อกัน" text={`${stats.streak} ข้อ`} tone={stats.streak >= 5 ? "ok" : "neutral"} />
        <Readout label="สถิติติดต่อกันสูงสุด" text={`${best} ข้อ`} />
      </>
    );
  } else if (decoded.ok) {
    const tolLetter = COLOURS[bands[bandCount === 4 ? 3 : 4]].letter;
    readouts = (
      <>
        <Readout label="ค่าที่ระบุ (nominal)" text={bandCount === 4 ? formatOhm(decoded.value) : formatOhmSig(decoded.value, 3)} />
        <Readout label="ค่าผิดพลาด" text={`${formatPercent(decoded.tolerance)}${tolLetter ? ` (${tolLetter})` : ""}`} />
        <Readout label="ช่วงค่าที่ยอมรับ" text={`${formatOhm(decoded.min)} – ${formatOhm(decoded.max)}`} />
        <Readout
          label="ค่ามาตรฐาน"
          text={isStandard ? `ใช่ (${series})` : "ไม่ใช่"}
          tone={decoded.value === 0 ? "neutral" : isStandard ? "ok" : "warn"}
        />
        {decoded.tempco !== undefined ? (
          <Readout label="TCR (แถบที่ 6)" text={`${decoded.tempco} ppm/K`} />
        ) : null}
        {decoded.tempco !== undefined ? (
          <Readout label="ΔR เมื่ออุณหภูมิเพิ่ม 50 K" text={`±${formatOhm(decoded.value * decoded.tempco * 1e-6 * 50, 3)}`} />
        ) : null}
        {mode === "make" ? <Readout label="เทียบกับเป้าหมาย" text={matched ? "ตรงแล้ว ✓" : decoded.value < target ? "น้อยกว่าเป้า" : "มากกว่าเป้า"} tone={matched ? "ok" : "warn"} /> : null}
      </>
    );
  } else {
    readouts = <Readout label="ค่าที่ระบุ" text="—" tone="danger" />;
  }

  const notes: string[] = [];
  if (mode === "read" || mode === "make") {
    if (decoded.ok && bands[0] === "black" && decoded.value !== 0) notes.push("แถบแรกของรหัสปกติไม่เป็นสีดำ — ตรวจทิศการอ่าน");
    if (decoded.ok && series === "E96" && decoded.tolerance >= 5) notes.push("ค่า E96 มักผลิตเป็น ±1% หรือดีกว่า ค่านี้กับ ±5% พบได้ยาก");
    if (decoded.ok && bandCount === 4 && bands[3] === "none") notes.push("แถบที่ 4 = ไม่มีแถบ คือตัวต้านทาน 3 แถบ ค่าผิดพลาด ±20%");
  }

  const footer = (
    <div className="space-y-3">
      {mode === "read" || mode === "make" ? (
        <p className="rounded-sm border border-line bg-panel px-3 py-2 text-[0.92rem] text-ink-2" aria-live="polite">
          <span className="font-semibold text-ink">วิธีอ่าน: </span>
          {explainBands(bands, bandCount)}
        </p>
      ) : null}
      {notes.map((n) => (
        <SimNotice key={n} tone="warn">
          {n}
        </SimNotice>
      ))}
      {compact ? (
        <details className="rounded-md border border-line bg-panel px-4 py-3">
          <summary className="cursor-pointer font-semibold text-ink">ตารางรหัสสี IEC 60062</summary>
          <ColourTable />
        </details>
      ) : (
        <ColourTable />
      )}
      <AssumptionsPanel items={ASSUMPTIONS} />
    </div>
  );

  return <LabShell compact={compact} stage={stage} stageLabel={stageLabel} controls={controls} readouts={readouts} footer={footer} />;
}

// ---------------------------------------------------------------------------

function Swatch({ c, size = 22 }: { c: ColourName; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[4px] border border-line-strong"
      style={{
        width: size,
        height: size,
        background:
          c === "none"
            ? "repeating-linear-gradient(45deg, transparent 0 4px, var(--line-strong) 4px 5px)"
            : COLOURS[c].hex,
      }}
    />
  );
}

function BandSelectors({
  bandCount,
  bands,
  onChange,
  onFocusBand,
}: {
  bandCount: BandCount;
  bands: ColourName[];
  onChange: (i: number, c: ColourName) => void;
  onFocusBand: (i: number | null) => void;
}) {
  const roles = bandRoles(bandCount);
  let d = 0;
  return (
    <div className="space-y-2">
      {roles.map((role, i) => {
        const label = `แถบที่ ${i + 1} · ${roleLabelTh(role, role === "digit" ? d++ : 0)}`;
        const c = bands[i];
        return (
          <div
            key={`${bandCount}-${i}`}
            className="flex items-end gap-2"
            onFocus={() => onFocusBand(i)}
            onBlur={() => onFocusBand(null)}
          >
            <div className="mb-2 flex w-[4.6rem] shrink-0 items-center gap-1.5">
              <Swatch c={c} />
              <span className="text-[0.85rem] font-medium text-ink">{COLOURS[c].th}</span>
            </div>
            <div className="min-w-0 flex-1">
              <LabSelect<ColourName>
                label={label}
                value={c}
                onChange={(v) => onChange(i, v)}
                options={coloursFor(role, bandCount).map((x) => ({ value: x, label: optionLabel(x, role) }))}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function optionLabel(c: ColourName, role: BandRole): string {
  return `${COLOURS[c].th} (${c}) — ${colourMeaning(c, role)}`;
}

function QuizControls({
  item,
  value,
  tol,
  feedback,
  onValue,
  onTol,
  onCheck,
  onNext,
  onSkip,
}: {
  item: QuizItem | null;
  value: string;
  tol: string;
  feedback: QuizFeedback;
  onValue: (v: string) => void;
  onTol: (v: string) => void;
  onCheck: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const id = useId();
  const nextRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (feedback) nextRef.current?.focus();
  }, [feedback]);
  return (
    <ControlGroup title="อ่านค่าตัวต้านทานสุ่ม">
      {item ? (
        <p className="text-[0.92rem] text-ink-2">
          สีแถบ ({item.bandCount} แถบ): <span className="font-semibold text-ink">{item.bands.map((c) => COLOURS[c].th).join(" – ")}</span>
        </p>
      ) : null}
      <div className="space-y-1">
        <label htmlFor={id} className="text-[0.95rem] font-medium text-ink">
          ค่าความต้านทาน (Ω)
        </label>
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="เช่น 4.7k, 4k7, 470, 0.47"
          value={value}
          disabled={!!feedback}
          onChange={(e) => onValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCheck();
          }}
          className="readout h-10 w-full rounded-sm border border-line-strong bg-panel px-2 text-ink disabled:opacity-60"
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="text-[0.82rem] text-ink-3">
          ใช้ k = กิโล, M (ตัวใหญ่) = เมกะ หรือพิมพ์แบบ 4k7 / 4R7 ได้
        </p>
      </div>
      <LabSelect
        label="ค่าผิดพลาด"
        value={tol}
        onChange={onTol}
        options={TOL_CHOICES.map((p) => ({ value: String(p), label: formatPercent(p) }))}
      />
      <div className="flex flex-wrap gap-2">
        {!feedback ? (
          <>
            <LabButton tone="primary" onClick={onCheck} disabled={!item || !value.trim()}>
              ตรวจคำตอบ
            </LabButton>
            <LabButton onClick={onSkip} disabled={!item}>
              ข้าม
            </LabButton>
          </>
        ) : (
          <button
            ref={nextRef}
            type="button"
            onClick={onNext}
            className="h-10 rounded-sm bg-cobalt px-3 font-semibold text-white transition-colors hover:bg-cobalt-ink"
          >
            ข้อต่อไป →
          </button>
        )}
      </div>
      {feedback ? (
        <SimNotice tone={feedback.correct ? "info" : "warn"}>
          <strong>{feedback.correct ? "✓ ถูกต้อง" : "✗ ยังไม่ถูก"}</strong>
          {!feedback.correct ? (
            <span>
              {" "}
              ({!feedback.valueOk ? "ค่าความต้านทานผิด" : ""}
              {!feedback.valueOk && !feedback.tolOk ? ", " : ""}
              {!feedback.tolOk ? "ค่าผิดพลาดผิด" : ""})
            </span>
          ) : null}
          <span className="mt-1 block">{feedback.explain}</span>
        </SimNotice>
      ) : null}
    </ControlGroup>
  );
}

function SmdControls({ code, onCode }: { code: string; onCode: (v: string) => void }) {
  const id = useId();
  const r = decodeSmd(code);
  return (
    <ControlGroup title="ถอดรหัสชิป SMD">
      <div className="space-y-1">
        <label htmlFor={id} className="text-[0.95rem] font-medium text-ink">
          รหัสบนชิป
        </label>
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={6}
          value={code}
          onChange={(e) => onCode(e.target.value)}
          className="readout h-10 w-full rounded-sm border border-line-strong bg-panel px-2 text-[1.1rem] uppercase tracking-wider text-ink"
          aria-describedby={`${id}-out`}
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="ตัวอย่างรหัส">
        {SMD_EXAMPLES.map((x) => (
          <LabButton key={x} onClick={() => onCode(x)} pressed={code.toUpperCase() === x} className="h-9 px-2.5 readout">
            {x}
          </LabButton>
        ))}
      </div>
      <div id={`${id}-out`} aria-live="polite">
        {r.ok ? (
          <SimNotice tone="info">
            {r.steps}
            {r.note ? <span className="mt-1 block text-ink-2">หมายเหตุ: {r.note}</span> : null}
          </SimNotice>
        ) : (
          <SimNotice tone="warn">{r.error}</SimNotice>
        )}
      </div>
    </ControlGroup>
  );
}

function ColourTable() {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-panel">
      <table className="w-full min-w-[420px] text-left text-[0.88rem]">
        <caption className="px-3 pt-2 text-left font-semibold text-ink">ตารางรหัสสี (IEC 60062)</caption>
        <thead className="text-ink-3">
          <tr>
            <th scope="col" className="px-3 py-1.5 font-medium">สี</th>
            <th scope="col" className="px-2 py-1.5 font-medium">ตัวเลข</th>
            <th scope="col" className="px-2 py-1.5 font-medium">ตัวคูณ</th>
            <th scope="col" className="px-2 py-1.5 font-medium">ค่าผิดพลาด</th>
            <th scope="col" className="px-2 py-1.5 font-medium">TCR (ppm/K)</th>
          </tr>
        </thead>
        <tbody className="readout text-ink">
          {ALL_COLOURS.map((c) => {
            const k = COLOURS[c];
            return (
              <tr key={c} className="border-t border-line">
                <th scope="row" className="px-3 py-1 font-sans font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Swatch c={c} size={16} />
                    {k.th}
                  </span>
                </th>
                <td className="px-2 py-1">{k.digit ?? "—"}</td>
                <td className="px-2 py-1">{k.exponent !== undefined ? colourMeaning(c, "multiplier") : "—"}</td>
                <td className="px-2 py-1">{k.tolerance !== undefined ? `${formatPercent(k.tolerance)} ${k.letter ?? ""}` : "—"}</td>
                <td className="px-2 py-1">{k.tempco ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
