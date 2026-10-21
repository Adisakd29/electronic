"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { LabProps } from "../types";
import {
  AssumptionsPanel,
  ControlGroup,
  DigitalDisplay,
  LabButton,
  LabSelect,
  LabShell,
  Readout,
  Segmented,
  SimNotice,
  Slider,
  Toggle,
} from "../shared/ui";
import { E12, eSeriesValues, formatSI } from "../shared/format";
import {
  CURRENT_LIMIT,
  LAMP_OVERLOAD,
  LAMP_RATED_P,
  R_MAX,
  R_MIN,
  V_MAX,
  V_MIN,
  V_STEP,
  addMeasurement,
  diagnose,
  distinctMeasurements,
  faultActive as isFaultActive,
  getPreset,
  lampStatus,
  nodesFor,
  randomFault,
  solve,
  symptomFor,
  voltmeter,
  type CircuitInput,
  type CircuitState,
  type Diagnosis,
  type Fault,
  type Measurement,
  type NodeId,
  type Topology,
  type Triple,
} from "./model";
import { CircuitStage, DOT_GAP } from "./Stage";
import { ASSUMPTIONS } from "./assumptions";

const TOPO_OPTS: { value: Topology; label: string }[] = [
  { value: "single", label: "เดี่ยว (single)" },
  { value: "series", label: "อนุกรม (series)" },
  { value: "parallel", label: "ขนาน (parallel)" },
  { value: "mixed", label: "ผสม (mixed)" },
];

const TOPO_TH: Record<Topology, string> = {
  single: "วงจรตัวต้านทานเดี่ยว",
  series: "วงจรอนุกรม R1–R2–R3",
  parallel: "วงจรขนาน R1‖R2‖R3",
  mixed: "วงจรผสม R1 อนุกรมกับ R2‖R3",
};

const NODE_DESC: Record<Topology, Partial<Record<NodeId, string>>> = {
  single: { P: "P — ขั้ว + แหล่งจ่าย (ก่อนสวิตช์)", A: "A — หลังสวิตช์และแอมมิเตอร์", G: "G — ขั้ว − แหล่งจ่าย" },
  series: {
    P: "P — ขั้ว + แหล่งจ่าย (ก่อนสวิตช์)",
    A: "A — หลังสวิตช์ (ก่อน R1)",
    B: "B — ระหว่าง R1 กับ R2",
    C: "C — ระหว่าง R2 กับ R3",
    G: "G — ขั้ว − แหล่งจ่าย",
  },
  parallel: { P: "P — ขั้ว + แหล่งจ่าย (ก่อนสวิตช์)", A: "A — บัสบน (หลังสวิตช์)", G: "G — บัสล่าง / ขั้ว −" },
  mixed: {
    P: "P — ขั้ว + แหล่งจ่าย (ก่อนสวิตช์)",
    A: "A — หลังสวิตช์ (ก่อน R1)",
    B: "B — จุดต่อ R1 กับ R2‖R3",
    G: "G — ขั้ว − แหล่งจ่าย",
  },
};

/** Probe pair that measures across resistor i in a topology. */
function acrossR(t: Topology, i: number): [NodeId, NodeId] {
  if (t === "series") return (([["A", "B"], ["B", "C"], ["C", "G"]] as [NodeId, NodeId][])[i]);
  if (t === "mixed") return i === 0 ? ["A", "B"] : ["B", "G"];
  return ["A", "G"];
}

const E12_VALUES = eSeriesValues(E12, R_MIN, R_MAX);

const FAULT_LABEL: Record<Fault, string> = {
  none: "ไม่มี (ปกติ)",
  open1: "R1 ขาด (open)",
  open2: "R2 ขาด (open)",
  open3: "R3 ขาด (open)",
  short1: "R1 ลัดวงจร (short)",
  short2: "R2 ลัดวงจร (short)",
  short3: "R3 ลัดวงจร (short)",
};

function fmtMeter(v: number): string {
  const a = Math.abs(v);
  const d = a >= 100 ? 1 : a >= 10 ? 2 : 3;
  return v.toFixed(d);
}

const RM_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const m = window.matchMedia(RM_QUERY);
  m.addEventListener?.("change", cb);
  return () => m.removeEventListener?.("change", cb);
}
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeRM,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(RM_QUERY).matches : false),
    () => false,
  );
}

export default function CircuitLab({ preset, onState, compact = false }: LabProps) {
  const p = getPreset(preset);
  const [inp, setInp] = useState<CircuitInput>(p.input);
  const [hidden, setHidden] = useState<boolean>(!!p.hidden);
  const [red, setRed] = useState<NodeId>("A");
  const [black, setBlack] = useState<NodeId>("G");
  const [guessR, setGuessR] = useState("1");
  const [guessKind, setGuessKind] = useState<"open" | "short">("open");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [playing, setPlaying] = useState(true);
  // Troubleshooting mission
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [faultSeed, setFaultSeed] = useState(1);
  const reduced = useReducedMotion();

  const clearMission = () => {
    setMeasurements([]);
    setDiagnosis(null);
    setFeedback(null);
  };

  // Reset when the preset changes.
  const presetKey = preset ?? "default";
  const lastPreset = useRef(presetKey);
  useEffect(() => {
    if (lastPreset.current === presetKey) return;
    lastPreset.current = presetKey;
    const np = getPreset(presetKey);
    setInp(np.input);
    setHidden(!!np.hidden);
    setMeasurements([]);
    setDiagnosis(null);
    setFeedback(null);
  }, [presetKey]);

  const sol = useMemo(() => solve(inp), [inp]);
  const base = sol.state;
  const nodes = nodesFor(base.topology);
  const redN = nodes.includes(red) ? red : "A";
  const blackN = nodes.includes(black) ? black : "G";
  const vm = voltmeter(sol, redN, blackN);
  const lamp = lampStatus(base);
  const n = base.topology === "single" ? 1 : 3;
  const faultActive = isFaultActive(base.topology, base.fault);
  const missionOn = hidden && faultActive;
  const symptom = useMemo(() => (missionOn ? symptomFor(inp) : null), [missionOn, inp]);

  const s: CircuitState = useMemo(
    () => ({ ...base, faultHidden: missionOn, symptom, measurements, diagnosis }),
    [base, missionOn, symptom, measurements, diagnosis],
  );

  // Measurement log: placing the probes on a new node pair while the fault is hidden is one measurement.
  const placeProbes = (r: NodeId, b: NodeId) => {
    const rn = nodes.includes(r) ? r : "A";
    const bn = nodes.includes(b) ? b : "G";
    setRed(rn);
    setBlack(bn);
    if (!missionOn || rn === bn || (rn === redN && bn === blackN)) return;
    const v = voltmeter(sol, rn, bn).v;
    setMeasurements((log) => addMeasurement(log, { kind: "V", where: `${rn}–${bn}`, value: v }));
  };
  const logAmmeter = () => setMeasurements((log) => addMeasurement(log, { kind: "I", where: "ammeter", value: base.I }));

  // Debounced state emission.
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => onStateRef.current?.(s), 150);
    return () => clearTimeout(t);
  }, [s]);

  // Current-flow dot animation (paused for reduced motion or by the user).
  const stageRef = useRef<HTMLDivElement>(null);
  const offsets = useRef(new Map<string, number>());
  const animate = playing && !reduced;
  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const els = stageRef.current?.querySelectorAll<SVGPathElement>("[data-flow]") ?? [];
      els.forEach((el) => {
        const id = el.dataset.flow ?? "";
        const v = Number(el.dataset.speed) || 0;
        const o = ((offsets.current.get(id) ?? 0) - v * dt) % DOT_GAP;
        offsets.current.set(id, o);
        el.style.strokeDashoffset = o.toFixed(2);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const set = (patch: Partial<CircuitInput>) => setInp((prev) => ({ ...prev, ...patch }));
  const setR = (i: number, v: number) =>
    setInp((prev) => {
      const R = [...prev.R] as Triple;
      R[i] = v;
      return { ...prev, R };
    });

  const nMeasured = distinctMeasurements(measurements);

  /** Step 1 of the mission: record the learner's diagnosis (does not change the circuit). */
  const tryDiagnose = () => {
    if (s.fault === "none") return;
    const guess = `${guessKind}${guessR}`;
    const d = diagnose(s.fault, guess, measurements);
    setDiagnosis(d);
    if (d.correct) {
      setFeedback({
        ok: true,
        text:
          `วินิจฉัยถูกต้อง: ${FAULT_LABEL[s.fault as Fault]} (วัดก่อนวินิจฉัย ${d.measurementsBefore} จุด)` +
          (d.measurementsBefore < 2 ? " — ครั้งหน้าควรวัดอย่างน้อย 2 จุดเพื่อยืนยันก่อนสรุป" : "") +
          " กด “ซ่อม” เพื่อเปลี่ยนอุปกรณ์",
      });
    } else {
      setFeedback({
        ok: false,
        text: "ยังไม่ใช่ — ลองวัดแรงดันคร่อมแต่ละตัวและอ่านแอมมิเตอร์อีกครั้ง: ตัวที่ขาดจะมีแรงดันแหล่งจ่ายตกคร่อมเกือบทั้งหมด (กระแส 0) ส่วนตัวที่ลัดจะมีแรงดันตกคร่อม ≈ 0 V ขณะที่กระแสรวมสูงกว่าปกติ",
      });
    }
  };

  /** Step 2: replace the component — only after a correct diagnosis. */
  const repair = () => {
    if (s.fault === "none" || !diagnosis?.correct) return;
    setFeedback({ ok: true, text: `ซ่อม ${FAULT_LABEL[s.fault as Fault]} แล้ว — วงจรกลับมาทำงานปกติ ตรวจสอบกระแสและแรงดันอีกครั้ง` });
    setHidden(false);
    set({ fault: "none" });
  };

  /** New hidden fault from the seeded PRNG (deterministic sequence per session). */
  const newRandomFault = () => {
    const f = randomFault(faultSeed, s.topology, s.fault);
    setFaultSeed((k) => k + 1);
    clearMission();
    setHidden(true);
    set({ fault: f, switchClosed: true });
  };

  const showTable = !missionOn;

  const stageLabel =
    `${TOPO_TH[s.topology]}${s.lamp ? " (R1 เป็นหลอดไฟ 12 V 6 W)" : ""} แหล่งจ่าย ${formatSI(s.V, "V")} ` +
    `สวิตช์ ${s.switchClosed ? "ON (ปิดวงจร)" : "OFF (เปิดวงจร)"} กระแสรวม ${formatSI(s.I, "A")}` +
    (faultActive && !hidden ? ` จุดบกพร่อง: ${FAULT_LABEL[s.fault as Fault]}` : "") +
    (missionOn && symptom ? ` อาการ: ${symptom}` : "");

  const notices = (
    <div className="space-y-2">
      {missionOn && symptom ? (
        <SimNotice tone="warn">
          <strong>อาการ:</strong> {symptom}
        </SimNotice>
      ) : null}
      {sol.shorted ? (
        <SimNotice tone="danger">
          <strong>ลัดวงจร – แหล่งจ่ายจำกัดกระแส</strong> ที่ {CURRENT_LIMIT} A แรงดันที่ขั้วแหล่งจ่ายตกเหลือ {formatSI(sol.Vt, "V")} (แหล่งจ่ายจริงที่ไม่มีการจำกัดกระแสจะจ่ายกระแสสูงมาก สายร้อน ฟิวส์ขาด)
        </SimNotice>
      ) : s.currentLimited ? (
        <SimNotice tone="warn">
          กระแสถึงขีดจำกัด {CURRENT_LIMIT} A — แหล่งจ่ายเข้าโหมดจำกัดกระแส (CC) แรงดันที่ขั้วลดเหลือ {formatSI(sol.Vt, "V")} แทน {formatSI(s.V, "V")}
        </SimNotice>
      ) : null}
      {!s.switchClosed ? (
        <SimNotice tone="info">
          สวิตช์ OFF (วงจรเปิด) — กระแสเป็นศูนย์ทุกจุด แรงดันแหล่งจ่ายทั้งหมดตกคร่อมหน้าสัมผัสสวิตช์ (วัด P–A)
        </SimNotice>
      ) : !Number.isFinite(s.Req) ? (
        <SimNotice tone="warn">
          สวิตช์ ON แต่ไม่มีกระแสไหล — วงจรขาดที่ใดที่หนึ่ง
          {hidden ? " ลองวัดแรงดันคร่อมแต่ละตัว: ตัวที่ขาดจะมีแรงดันแหล่งจ่ายตกคร่อมเกือบทั้งหมด" : ""}
        </SimNotice>
      ) : null}
      {lamp.overload ? (
        <SimNotice tone="danger">
          หลอดได้รับกำลัง {formatSI(lamp.P, "W")} เกิน {LAMP_OVERLOAD} × พิกัด {LAMP_RATED_P} W — หลอดจริงจะร้อนจัดและไส้หลอดขาดเร็ว
        </SimNotice>
      ) : null}
    </div>
  );

  const controls = (
    <>
      <ControlGroup title="แหล่งจ่ายและสวิตช์ (supply & switch)">
        <Slider label="แรงดันแหล่งจ่าย V" value={s.V} onChange={(v) => set({ V: v })} min={V_MIN} max={V_MAX} step={V_STEP} unit="V" hint="0–24 V ปรับทีละ 0.5 V · จำกัดกระแส 3 A" />
        <Toggle
          label="สวิตช์ S (ON = ปิดวงจร)"
          description={s.switchClosed ? "ON — หน้าสัมผัสแตะกัน กระแสไหลได้" : "OFF — หน้าสัมผัสแยก วงจรเปิด"}
          checked={s.switchClosed}
          onChange={(v) => set({ switchClosed: v })}
        />
      </ControlGroup>

      <ControlGroup title="รูปแบบวงจร (topology)">
        <Segmented label="การต่อ" value={s.topology} onChange={(v) => set({ topology: v })} options={TOPO_OPTS} size="sm" />
        <Toggle
          label="โหมดหลอดไฟ (lamp) แทน R1"
          description="หลอด 12 V 6 W ความต้านทานขณะร้อน 24 Ω"
          checked={s.lamp}
          onChange={(v) => set({ lamp: v })}
        />
      </ControlGroup>

      <ControlGroup title="ตัวต้านทาน (resistors)">
        {Array.from({ length: n }, (_, i) => {
          const name = `R${i + 1}`;
          if (i === 0 && s.lamp)
            return (
              <p key={i} className="rounded-sm border border-line bg-panel-2 px-3 py-2 text-[0.92rem] text-ink-2">
                R1 ถูกแทนด้วยหลอดไฟ 24 Ω (ค่าคงที่) — ปิดโหมดหลอดไฟเพื่อปรับ R1
              </p>
            );
          const e12 = E12_VALUES.find((v) => Math.abs(v - s.R[i]) < 1e-9 * v);
          return (
            <div key={i} className="space-y-2 rounded-sm border border-line p-2">
              <LabSelect
                label={`${name} — ค่ามาตรฐาน E12`}
                value={e12 !== undefined ? String(e12) : "custom"}
                onChange={(v) => v !== "custom" && setR(i, Number(v))}
                options={[
                  ...(e12 === undefined ? [{ value: "custom", label: `กำหนดเอง (${formatSI(s.R[i], "Ω")})` }] : []),
                  ...E12_VALUES.map((v) => ({ value: String(v), label: formatSI(v, "Ω") })),
                ]}
              />
              <Slider label={`${name} (พิมพ์ค่า เช่น 4.7k)`} value={s.R[i]} onChange={(v) => setR(i, v)} min={R_MIN} max={R_MAX} unit="Ω" log />
            </div>
          );
        })}
      </ControlGroup>

      <ControlGroup title="โวลต์มิเตอร์ (voltmeter)">
        <DigitalDisplay label={`แรงดัน ${redN} เทียบ ${blackN}`} text={fmtMeter(vm.v)} unit="V DC" />
        <p className="text-[0.85rem] text-ink-3" aria-live="polite">
          {vm.floating
            ? "จุดที่วัดลอยอยู่ (ไม่ครบวงจรกับแหล่งจ่าย) มิเตอร์จึงอ่านได้ 0 V"
            : `วัดจุด ${redN} (สายแดง +) เทียบ ${blackN} (สายดำ COM)`}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <LabSelect
            label="สายแดง (+)"
            value={redN}
            onChange={(v) => placeProbes(v, blackN)}
            options={nodes.map((id) => ({ value: id, label: NODE_DESC[s.topology][id] ?? id }))}
          />
          <LabSelect
            label="สายดำ (COM)"
            value={blackN}
            onChange={(v) => placeProbes(redN, v)}
            options={nodes.map((id) => ({ value: id, label: NODE_DESC[s.topology][id] ?? id }))}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="วัดคร่อมอุปกรณ์อย่างรวดเร็ว">
          {Array.from({ length: n }, (_, i) => (
            <LabButton
              key={i}
              className="h-9 text-[0.9rem]"
              onClick={() => {
                const [a, b] = acrossR(s.topology, i);
                placeProbes(a, b);
              }}
            >
              คร่อม {i === 0 && s.lamp ? "หลอด" : `R${i + 1}`}
            </LabButton>
          ))}
          <LabButton
            className="h-9 text-[0.9rem]"
            onClick={() => placeProbes("P", "A")}
          >
            คร่อมสวิตช์
          </LabButton>
        </div>
      </ControlGroup>

      <ControlGroup title="ห้องทดลองวงจรขัดข้อง (troubleshooting)">
        {missionOn ? (
          <>
            <SimNotice tone="info">
              มีจุดบกพร่องซ่อนอยู่ 1 จุด — ขั้นตอน: ① สังเกตอาการ ② วัดแรงดันคร่อมแต่ละตัวและอ่านแอมมิเตอร์ (บันทึกอัตโนมัติ) ③ วินิจฉัย ④ ซ่อม
            </SimNotice>
            <div className="rounded-sm border border-line bg-panel-2 px-3 py-2 text-[0.9rem]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">บันทึกการวัด ({nMeasured} จุด)</span>
                <LabButton className="h-8 px-2 text-[0.85rem]" onClick={logAmmeter}>
                  อ่านแอมมิเตอร์ {formatSI(base.I, "A")}
                </LabButton>
              </div>
              {measurements.length ? (
                <ol className="readout mt-1 list-decimal space-y-0.5 pl-5 text-ink-2" aria-live="polite">
                  {measurements.map((m, i) => (
                    <li key={i}>
                      {m.kind === "V" ? `V(${m.where}) = ${fmtMeter(m.value)} V` : `I(แอมมิเตอร์) = ${formatSI(m.value, "A")}`}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-ink-3">ยังไม่มีการวัด — เลือกคู่จุดวัดที่โวลต์มิเตอร์หรือกดปุ่มอ่านแอมมิเตอร์</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LabSelect
                label="ตัวที่บกพร่อง"
                value={guessR}
                onChange={setGuessR}
                options={Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: i === 0 && s.lamp ? "หลอด (R1)" : `R${i + 1}` }))}
              />
              <LabSelect
                label="ลักษณะ"
                value={guessKind}
                onChange={setGuessKind}
                options={[
                  { value: "open", label: "ขาด (open)" },
                  { value: "short", label: "ลัด (short)" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LabButton tone="primary" onClick={tryDiagnose}>
                วินิจฉัย
              </LabButton>
              <LabButton tone="ok" onClick={repair} disabled={!diagnosis?.correct}>
                ซ่อม
              </LabButton>
            </div>
            {diagnosis ? (
              <p className="text-[0.85rem] text-ink-3">
                การวินิจฉัยล่าสุด: {FAULT_LABEL[diagnosis.guess as Fault] ?? diagnosis.guess} — {diagnosis.correct ? "ถูกต้อง" : "ไม่ถูกต้อง"} (วัดก่อนวินิจฉัย{" "}
                {diagnosis.measurementsBefore} จุด)
              </p>
            ) : null}
          </>
        ) : s.fault !== "none" ? (
          <>
            <p className="text-[0.92rem] text-ink">
              จุดบกพร่อง: <strong className="text-danger">{FAULT_LABEL[s.fault as Fault]}</strong>
              {!faultActive ? " (ตำแหน่งนี้ไม่อยู่ในวงจรแบบเดี่ยว จึงไม่มีผล)" : ""}
            </p>
            <LabButton
              tone="primary"
              className="w-full"
              onClick={() => {
                setFeedback({ ok: true, text: `ซ่อม ${FAULT_LABEL[s.fault as Fault]} แล้ว` });
                setDiagnosis(null);
                set({ fault: "none" });
              }}
            >
              ซ่อม
            </LabButton>
          </>
        ) : (
          <p className="text-[0.92rem] text-ink-2">วงจรปกติ ไม่มีจุดบกพร่อง — กด “สุ่มจุดเสียใหม่” เพื่อฝึกหาจุดบกพร่องอีกครั้ง</p>
        )}
        <LabButton className="w-full" onClick={newRandomFault}>
          สุ่มจุดเสียใหม่
        </LabButton>
        {feedback ? (
          <SimNotice tone={feedback.ok ? "info" : "warn"}>
            {feedback.ok ? "✓ " : ""}
            {feedback.text}
          </SimNotice>
        ) : null}
        <details className="rounded-sm border border-line px-3 py-2">
          <summary className="cursor-pointer text-[0.92rem] font-medium text-ink">สำหรับครู: ใส่จุดบกพร่อง (fault injection)</summary>
          <div className="mt-2 space-y-2">
            {hidden && s.fault !== "none" ? (
              <LabButton className="w-full" onClick={() => setHidden(false)}>
                เฉลย — แสดงจุดบกพร่อง
              </LabButton>
            ) : (
              <LabSelect
                label="จุดบกพร่อง"
                value={s.fault as Fault}
                onChange={(v) => {
                  clearMission();
                  set({ fault: v });
                }}
                options={(Object.keys(FAULT_LABEL) as Fault[]).map((f) => ({ value: f, label: FAULT_LABEL[f] }))}
              />
            )}
            <Toggle
              label="ซ่อนจุดบกพร่องจากผู้เรียน"
              checked={hidden}
              onChange={(v) => {
                if (v) clearMission();
                setHidden(v);
              }}
            />
          </div>
        </details>
      </ControlGroup>

      <div className="flex flex-wrap gap-2">
        {!reduced ? (
          <LabButton onClick={() => setPlaying((v) => !v)} pressed={!playing}>
            {playing ? "หยุดจุดกระแส" : "เล่นจุดกระแส"}
          </LabButton>
        ) : null}
      </div>
    </>
  );

  const readouts = (
    <>
      <Readout label="แรงดันที่ขั้วแหล่งจ่าย" value={sol.Vt} unit="V" tone={s.currentLimited ? "warn" : "neutral"} />
      <Readout label="กระแสรวม I (แอมมิเตอร์)" value={s.I} unit="A" tone={sol.shorted ? "danger" : s.currentLimited ? "warn" : "neutral"} />
      <Readout label="ความต้านทานรวม R_eq" value={s.Req} unit="Ω" />
      <Readout label="กำลังรวม P" value={s.P} unit="W" />
      {s.lamp ? (
        <Readout
          label="ความสว่างหลอด (P/6 W)"
          text={`${Math.round(lamp.brightness * 100)} %${lamp.overload ? " เกินพิกัด" : ""}`}
          tone={lamp.overload ? "danger" : "neutral"}
        />
      ) : null}
    </>
  );

  const table = showTable ? (
    <div className="overflow-x-auto rounded-md border border-line bg-panel">
      <table className="w-full min-w-[300px] text-left text-[0.92rem]">
        <caption className="px-3 pt-2 text-left font-semibold text-ink">ค่าที่แต่ละอุปกรณ์ (V = I·R, P = V·I)</caption>
        <thead className="text-ink-3">
          <tr>
            <th scope="col" className="px-3 py-1 font-medium">อุปกรณ์</th>
            <th scope="col" className="px-3 py-1 font-medium">แรงดัน V</th>
            <th scope="col" className="px-3 py-1 font-medium">กระแส I</th>
            <th scope="col" className="px-3 py-1 font-medium">กำลัง P</th>
          </tr>
        </thead>
        <tbody className="readout text-ink">
          {Array.from({ length: n }, (_, i) => {
            const over = !(i === 0 && s.lamp) && s.PR[i] > 0.25;
            return (
              <tr key={i} className="border-t border-line">
                <th scope="row" className="px-3 py-1 font-sans font-semibold">
                  {i === 0 && s.lamp ? "หลอด" : `R${i + 1}`}
                  {faultActive && !hidden && Number(s.fault.slice(-1)) === i + 1 ? (
                    <span className="ml-1 text-[0.82rem] text-danger">({s.fault.startsWith("open") ? "ขาด" : "ลัด"})</span>
                  ) : null}
                </th>
                <td className="px-3 py-1">{formatSI(s.VR[i], "V")}</td>
                <td className="px-3 py-1">{formatSI(s.IR[i], "A")}</td>
                <td className="px-3 py-1">
                  {formatSI(s.PR[i], "W")}
                  {over ? <span className="ml-1 font-sans text-[0.82rem] text-warn">(เกิน ¼ W)</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {s.topology !== "single" ? (
        <p className="border-t border-line px-3 py-1.5 text-[0.85rem] text-ink-3">
          {s.topology === "series"
            ? `KVL: V_R1 + V_R2 + V_R3 = ${formatSI(s.VR[0] + s.VR[1] + s.VR[2], "V")} (แรงดันที่ขั้ว ${formatSI(sol.Vt, "V")})`
            : s.topology === "parallel"
              ? `KCL: I_R1 + I_R2 + I_R3 = ${formatSI(s.IR[0] + s.IR[1] + s.IR[2], "A")} = I รวม`
              : `KCL ที่จุด B: I_R2 + I_R3 = ${formatSI(s.IR[1] + s.IR[2], "A")} = I_R1`}
        </p>
      ) : null}
    </div>
  ) : (
    <p className="rounded-md border border-line bg-panel-2 px-3 py-2 text-[0.92rem] text-ink-2">
      โหมดหาจุดบกพร่อง: ตารางค่าของแต่ละตัวถูกซ่อนไว้ — ใช้โวลต์มิเตอร์วัดคร่อมทีละตัวและอ่านแอมมิเตอร์เหมือนการตรวจซ่อมจริง แล้วเทียบกับค่าที่คำนวณจาก R ที่ติดฉลาก (
      {s.topology === "series" ? "อนุกรม: ตัวที่ขาดรับแรงดันเกือบทั้งหมด ตัวที่ลัดได้ ≈ 0 V" : s.topology === "parallel" ? "ขนาน: ตัวที่ลัดทำให้แหล่งจ่ายจำกัดกระแส ตัวที่ขาดทำให้กระแสรวมลดลง" : "ผสม: ดูว่าแรงดันที่จุด B สูงหรือต่ำกว่าที่ควร"})
    </p>
  );

  return (
    <LabShell
      compact={compact}
      stageLabel={stageLabel}
      stage={
        <div ref={stageRef}>
          <CircuitStage sol={sol} faultHidden={hidden} probes={{ red: redN, black: blackN }} symptom={missionOn ? symptom : null} />
          <p className="px-1 pt-1 text-[0.82rem] text-ink-3">
            จุดสีส้ม = กระแสสมมติ (conventional current) ไหลจาก + ผ่านโหลดกลับ − · ความเร็วแปรตามกระแส
            {reduced ? " (ปิดการเคลื่อนไหวตามการตั้งค่าระบบ)" : ""}
          </p>
        </div>
      }
      readouts={readouts}
      controls={controls}
      footer={
        <div className="space-y-3">
          {notices}
          {table}
          <AssumptionsPanel items={ASSUMPTIONS} />
        </div>
      }
    />
  );
}
