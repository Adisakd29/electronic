"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LabProps } from "../types";
import { AssumptionsPanel, ControlGroup, LabButton, LabSelect, LabShell, Readout, Segmented, SimNotice, Slider, Toggle } from "../shared/ui";
import { formatSI } from "../shared/format";
import {
  FREQ_STEPS,
  LIMITS,
  TIME_DIV_STEPS,
  VOLTS_DIV_STEPS,
  mysteryGen,
  presetInputs,
  solve,
  stepValue,
  type Ch2Source,
  type ChannelSettings,
  type Coupling,
  type Measurement,
  type OscInputs,
  type OscilloscopeState,
  type ProbeX,
  type Source,
  type Wave,
} from "./model";
import { describeScreen, ScopeStage } from "./Stage";
import { ASSUMPTIONS } from "./assumptions";

interface Board {
  preset: string | undefined;
  inp: OscInputs;
  s: OscilloscopeState;
}

const init = (preset: string | undefined): Board => {
  const inp = presetInputs(preset);
  return { preset, inp, s: solve(inp) };
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

const WAVES: { value: Wave; label: string }[] = [
  { value: "sine", label: "ไซน์ sine" },
  { value: "square", label: "สี่เหลี่ยม square" },
  { value: "triangle", label: "สามเหลี่ยม triangle" },
  { value: "dc", label: "DC" },
];

const SOURCE_LABEL: Record<Ch2Source, string> = {
  off: "ปิด (ไม่ใช้ CH2)",
  gen: "เครื่องกำเนิดสัญญาณ",
  transformer: "หม้อแปลง 12 V rms 50 Hz (ขดทุติยภูมิ)",
  halfwave: "เรียงกระแสครึ่งคลื่น (1 ไดโอด) + โหลด 1 kΩ",
  bridge: "เรียงกระแสบริดจ์ (4 ไดโอด) + โหลด 1 kΩ",
  "bridge-cap": "บริดจ์ + C 470 µF ขนานโหลด 1 kΩ",
};

const vdOptions = VOLTS_DIV_STEPS.map((v) => ({ value: String(v), label: `${formatSI(v, "V")}/div` }));
const tdOptions = TIME_DIV_STEPS.map((v) => ({ value: String(v), label: `${formatSI(v, "s")}/div` }));

function waveName(w: Wave) {
  return WAVES.find((x) => x.value === w)?.label ?? w;
}

function StepButtons({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <LabButton onClick={onDown} className="h-9 px-2 text-[0.85rem]">
        ◀ ลด (1-2-5)
      </LabButton>
      <LabButton onClick={onUp} className="h-9 px-2 text-[0.85rem]">
        เพิ่ม (1-2-5) ▶
      </LabButton>
    </div>
  );
}

function ChannelControls<S extends string>({
  n,
  ch,
  sources,
  onChange,
}: {
  n: 1 | 2;
  ch: ChannelSettings<S>;
  sources: S[];
  onChange: (patch: Partial<ChannelSettings<S>>) => void;
}) {
  const off = ch.source === "off";
  return (
    <ControlGroup title={`CH${n} (แนวตั้ง)`}>
      <LabSelect<S> label={`สัญญาณเข้า CH${n}`} value={ch.source} onChange={(v) => onChange({ source: v } as Partial<ChannelSettings<S>>)} options={sources.map((v) => ({ value: v, label: SOURCE_LABEL[v as Ch2Source] }))} />
      {off ? null : (
        <>
          <LabSelect label={`VOLTS/DIV CH${n}`} value={String(ch.voltsDiv)} onChange={(v) => onChange({ voltsDiv: Number(v) } as Partial<ChannelSettings<S>>)} options={vdOptions} />
          <Slider label={`POSITION CH${n} (ตำแหน่ง 0 V)`} value={ch.pos} onChange={(v) => onChange({ pos: v } as Partial<ChannelSettings<S>>)} min={LIMITS.pos[0]} max={LIMITS.pos[1]} step={0.1} format={(v) => `${v.toFixed(1)} div`} />
          <Segmented<Coupling>
            label={`COUPLING CH${n}`}
            size="sm"
            value={ch.coupling}
            onChange={(v) => onChange({ coupling: v } as Partial<ChannelSettings<S>>)}
            options={[
              { value: "AC", label: "AC" },
              { value: "DC", label: "DC" },
              { value: "GND", label: "GND" },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Segmented<"1" | "10">
              label="ตัวคูณโพรบ (เมนูสโคป)"
              size="sm"
              value={String(ch.probeMenu) as "1" | "10"}
              onChange={(v) => onChange({ probeMenu: Number(v) as ProbeX } as Partial<ChannelSettings<S>>)}
              options={[
                { value: "1", label: "×1" },
                { value: "10", label: "×10" },
              ]}
            />
            <Segmented<"1" | "10">
              label="สวิตช์ที่ตัวโพรบ"
              size="sm"
              value={String(ch.probeSwitch) as "1" | "10"}
              onChange={(v) => onChange({ probeSwitch: Number(v) as ProbeX } as Partial<ChannelSettings<S>>)}
              options={[
                { value: "1", label: "×1" },
                { value: "10", label: "×10" },
              ]}
            />
          </div>
        </>
      )}
    </ControlGroup>
  );
}

function measReadouts(n: 1 | 2, m: Measurement): ReactNode[] {
  const q = (v: string) => (m.clipped ? "? (ล้นจอ)" : v);
  return [
    <Readout key={`vpp${n}`} label={`MEASURE CH${n}: Vpp`} text={q(formatSI(m.vpp, "V"))} />,
    <Readout key={`vrms${n}`} label={`MEASURE CH${n}: Vrms`} text={q(formatSI(m.vrms, "V"))} />,
    <Readout key={`f${n}`} label={`MEASURE CH${n}: ความถี่`} text={q(Number.isFinite(m.freq) ? formatSI(m.freq, "Hz") : "—")} />,
    <Readout key={`T${n}`} label={`MEASURE CH${n}: คาบ T`} text={q(Number.isFinite(m.period) ? formatSI(m.period, "s") : "—")} />,
  ];
}

export default function OscilloscopeLab({ preset, onState, compact = false }: LabProps) {
  const [b, setB] = useState<Board>(() => init(preset));
  const [revealed, setRevealed] = useState(false);
  const [roll, setRoll] = useState(0.2);
  if (b.preset !== preset) {
    setB(init(preset));
    setRevealed(false);
  }
  const { inp, s } = b;
  const reduced = usePrefersReducedMotion();

  const set = (patch: Partial<OscInputs>) =>
    setB((cur) => {
      const next = { ...cur.inp, ...patch };
      return { ...cur, inp: next, s: solve(next) };
    });
  const setGen = (patch: Partial<OscInputs["gen"]>) => set({ gen: { ...inp.gen, ...patch } });
  const setTrig = (patch: Partial<OscInputs["trigger"]>) => set({ trigger: { ...inp.trigger, ...patch } });
  const setCur = (patch: Partial<OscInputs["cursors"]>) => set({ cursors: { ...inp.cursors, ...patch } });

  const cb = useRef(onState);
  useEffect(() => {
    cb.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => cb.current?.(s), 150);
    return () => clearTimeout(t);
  }, [s]);

  // Untriggered (AUTO free-run): the trace rolls. Frozen under reduced motion.
  useEffect(() => {
    if (s.triggered || reduced) return;
    const id = setInterval(() => setRoll((r) => (r + 0.13) % 1), 160);
    return () => clearInterval(id);
  }, [s.triggered, reduced]);

  const ch2on = inp.ch2.source !== "off";
  const trigCh = inp.trigger.source === 2 && ch2on ? s.ch2 : s.ch1;
  const trigMeas = inp.trigger.source === 2 && ch2on ? s.meas2 : s.meas1;
  const lvlSpan = 4 * trigCh.voltsDiv;
  const hideGen = inp.mystery && !revealed;

  const controls = (
    <>
      <ControlGroup title="เครื่องกำเนิดสัญญาณ (function generator)">
        <Toggle
          label="โหมดปริศนา (mystery)"
          description="ซ่อนการตั้งเครื่องกำเนิด สุ่มสัญญาณให้อ่านจากจอเอง"
          checked={inp.mystery}
          onChange={(v) => {
            setRevealed(false);
            set(v ? { mystery: true, gen: mysteryGen(inp.seed), measureVisible: false } : { mystery: false });
          }}
        />
        {inp.mystery ? (
          <div className="flex flex-wrap gap-2">
            <LabButton
              onClick={() => {
                const seed = inp.seed + 1;
                setRevealed(false);
                set({ seed, gen: mysteryGen(seed) });
              }}
            >
              สุ่มสัญญาณใหม่
            </LabButton>
            <LabButton onClick={() => setRevealed((r) => !r)} pressed={revealed}>
              {revealed ? "ซ่อนเฉลย" : "ดูเฉลย"}
            </LabButton>
          </div>
        ) : null}
        {hideGen ? (
          <p className="rounded-sm border border-line bg-panel-2 px-3 py-2 text-[0.9rem] text-ink-2">
            ค่าการตั้งถูกซ่อน (สัญญาณชุดที่ {inp.seed}) — อ่าน Vpp, คาบ T และความถี่ f จากจอ แล้วกด “ดูเฉลย” ตรวจคำตอบ
          </p>
        ) : inp.mystery ? (
          <p className="readout rounded-sm border border-line bg-panel-2 px-3 py-2 text-[0.92rem] text-ink" aria-live="polite">
            เฉลย: {waveName(inp.gen.wave)} {formatSI(inp.gen.freq, "Hz")} {formatSI(inp.gen.vpp, "V")}pp (T = {formatSI(1 / inp.gen.freq, "s")})
          </p>
        ) : (
          <>
            <Segmented<Wave> label="รูปคลื่น (WAVEFORM)" size="sm" value={inp.gen.wave} onChange={(w) => setGen({ wave: w })} options={WAVES} />
            {inp.gen.wave === "dc" ? null : (
              <>
                <Slider label="ความถี่ (FREQ)" value={inp.gen.freq} onChange={(v) => setGen({ freq: v })} min={LIMITS.freq[0]} max={LIMITS.freq[1]} log unit="Hz" />
                <StepButtons label="ปรับความถี่ทีละขั้น 1-2-5" onDown={() => setGen({ freq: stepValue(FREQ_STEPS, inp.gen.freq, -1) })} onUp={() => setGen({ freq: stepValue(FREQ_STEPS, inp.gen.freq, 1) })} />
                <Slider label="ขนาด (AMPL) ยอดถึงยอด" value={inp.gen.vpp} onChange={(v) => setGen({ vpp: v })} min={LIMITS.vpp[0]} max={LIMITS.vpp[1]} step={0.1} format={(v) => `${formatSI(v, "V")}pp`} />
              </>
            )}
            <Slider
              label={inp.gen.wave === "dc" ? "แรงดัน DC (OFFSET)" : "OFFSET (ระดับ DC)"}
              value={inp.gen.offset}
              onChange={(v) => setGen({ offset: v })}
              min={LIMITS.offset[0]}
              max={LIMITS.offset[1]}
              step={0.1}
              unit="V"
            />
          </>
        )}
      </ControlGroup>

      <ChannelControls<Source> n={1} ch={inp.ch1} sources={["gen", "transformer"]} onChange={(p) => set({ ch1: { ...inp.ch1, ...p } })} />
      <ChannelControls<Ch2Source> n={2} ch={inp.ch2} sources={["off", "gen", "transformer", "halfwave", "bridge", "bridge-cap"]} onChange={(p) => set({ ch2: { ...inp.ch2, ...p } })} />

      <ControlGroup title="แนวนอน (HORIZONTAL)">
        <LabSelect label="TIME/DIV" value={String(inp.timeDiv)} onChange={(v) => set({ timeDiv: Number(v) })} options={tdOptions} />
        <Slider label="H-POSITION (เลื่อนจุดทริกเกอร์)" value={inp.hpos} onChange={(v) => set({ hpos: v })} min={LIMITS.hpos[0]} max={LIMITS.hpos[1]} step={0.1} format={(v) => `${v.toFixed(1)} div`} />
      </ControlGroup>

      <ControlGroup title="ทริกเกอร์ (TRIGGER)">
        <div className="grid grid-cols-2 gap-2">
          <Segmented<"1" | "2">
            label="SOURCE"
            size="sm"
            value={String(inp.trigger.source) as "1" | "2"}
            onChange={(v) => setTrig({ source: Number(v) as 1 | 2 })}
            options={[
              { value: "1", label: "CH1" },
              { value: "2", label: "CH2" },
            ]}
          />
          <Segmented<"rising" | "falling">
            label="ขอบ (EDGE)"
            size="sm"
            value={inp.trigger.edge}
            onChange={(v) => setTrig({ edge: v })}
            options={[
              { value: "rising", label: "↑ ขาขึ้น" },
              { value: "falling", label: "↓ ขาลง" },
            ]}
          />
        </div>
        <Slider label="LEVEL (ระดับทริกเกอร์)" value={inp.trigger.level} onChange={(v) => setTrig({ level: v })} min={-lvlSpan} max={lvlSpan} step={trigCh.voltsDiv / 25} unit="V" />
        <LabButton onClick={() => trigMeas && setTrig({ level: Number(((trigMeas.vmax + trigMeas.vmin) / 2).toPrecision(4)) })}>ตั้ง LEVEL กลางสัญญาณ (50 %)</LabButton>
      </ControlGroup>

      <ControlGroup title="เคอร์เซอร์และ MEASURE">
        <Toggle label="แสดง MEASURE อัตโนมัติ" description="ปิดไว้เมื่อฝึกอ่านค่าจากจอเอง" checked={inp.measureVisible} onChange={(v) => set({ measureVisible: v })} />
        <Toggle label="เคอร์เซอร์ (CURSORS)" description="วัด ΔV, Δt และ 1/Δt ด้วยเส้นประ" checked={inp.cursors.on} onChange={(v) => setCur({ on: v })} />
        {inp.cursors.on ? (
          <>
            <Segmented<"1" | "2">
              label="เคอร์เซอร์แรงดันอ่านตามช่อง"
              size="sm"
              value={String(inp.cursors.ch) as "1" | "2"}
              onChange={(v) => setCur({ ch: Number(v) as 1 | 2 })}
              options={[
                { value: "1", label: "CH1" },
                { value: "2", label: "CH2" },
              ]}
            />
            <Slider label="X1 (เวลา)" value={inp.cursors.x1} onChange={(v) => setCur({ x1: v })} min={0} max={10} step={0.1} format={(v) => `${v.toFixed(1)} div`} />
            <Slider label="X2 (เวลา)" value={inp.cursors.x2} onChange={(v) => setCur({ x2: v })} min={0} max={10} step={0.1} format={(v) => `${v.toFixed(1)} div`} />
            <Slider label="Y1 (แรงดัน)" value={inp.cursors.y1} onChange={(v) => setCur({ y1: v })} min={-4} max={4} step={0.1} format={(v) => `${v.toFixed(1)} div`} />
            <Slider label="Y2 (แรงดัน)" value={inp.cursors.y2} onChange={(v) => setCur({ y2: v })} min={-4} max={4} step={0.1} format={(v) => `${v.toFixed(1)} div`} />
          </>
        ) : null}
      </ControlGroup>
    </>
  );

  const readouts: ReactNode[] = [
    <Readout key="trig" label="ทริกเกอร์" text={s.triggered ? "Trig'd — ภาพนิ่ง" : "Trig? — ภาพวิ่ง"} tone={s.triggered ? "ok" : "warn"} />,
    <Readout key="div" label="ความสูง CH1 (ช่อง)" text={`${s.divsVertical.toFixed(2)} div${s.fullyOnScreen ? "" : " (ล้นจอ)"}`} tone={s.fullyOnScreen ? "neutral" : "warn"} />,
    <Readout key="cyc" label="จำนวนรอบ CH1 บนจอ" text={s.cyclesOnScreen > 0 ? `${Number(s.cyclesOnScreen.toPrecision(3))} รอบ` : "— (DC)"} />,
    <Readout key="win" label="เวลาเต็มจอ (10 ช่อง)" value={10 * s.timeDiv} unit="s" />,
  ];
  if (s.cursors.on) {
    readouts.push(
      <Readout key="dv" label={`เคอร์เซอร์ ΔV (CH${s.cursors.ch})`} value={s.cursor.dV} unit="V" />,
      <Readout key="dt" label="เคอร์เซอร์ Δt" value={s.cursor.dt} unit="s" />,
      <Readout key="idt" label="1/Δt" text={Number.isFinite(s.cursor.invDt) ? formatSI(s.cursor.invDt, "Hz") : "—"} />,
    );
  }
  if (s.measureVisible) {
    readouts.push(...measReadouts(1, s.meas1));
    if (s.meas2) readouts.push(...measReadouts(2, s.meas2));
  }

  const usesTransformer = inp.ch1.source !== "gen" || (inp.ch2.source !== "off" && inp.ch2.source !== "gen");
  const footer = (
    <div className="space-y-2">
      {!s.triggered && inp.trigger.source === 2 && !ch2on ? <SimNotice tone="warn">Trig?: SOURCE ตั้งเป็น CH2 แต่ CH2 ปิดอยู่ — เลือก SOURCE = CH1 หรือเปิด CH2</SimNotice> : null}
      {!s.triggered && !(inp.trigger.source === 2 && !ch2on) ? (
        <SimNotice tone="warn">
          Trig?: ระดับทริกเกอร์ {formatSI(inp.trigger.level, "V")} ไม่ตัดผ่านสัญญาณของ CH{trigCh === s.ch2 ? 2 : 1}
          {trigMeas ? ` (ช่วง ${formatSI(trigMeas.vmin, "V")} ถึง ${formatSI(trigMeas.vmax, "V")})` : ""} หรือช่องนั้นเป็นเส้นตรง — ภาพจึงไม่นิ่ง ปรับ LEVEL ให้อยู่ระหว่างยอดล่างกับยอดบน
        </SimNotice>
      ) : null}
      {!s.fullyOnScreen ? <SimNotice tone="warn">คลื่น CH1 ล้นขอบจอ อ่านยอดไม่ได้ — เพิ่ม VOLTS/DIV หรือปรับ POSITION</SimNotice> : null}
      {s.genClipped ? <SimNotice tone="warn">Vpp/2 + |OFFSET| เกินขีดจำกัดเอาต์พุต ±10 V ของเครื่องกำเนิด ยอดคลื่นจึงถูกตัด</SimNotice> : null}
      {inp.ch1.coupling === "GND" ? <SimNotice tone="info">CH1 ตั้ง GND: ตัดสัญญาณออก เหลือเส้นตรงที่ตำแหน่ง 0 V ใช้หาเส้นอ้างอิงศูนย์</SimNotice> : null}
      {s.cyclesOnScreen > 60 ? <SimNotice tone="info">สัญญาณถี่เกินกว่าจะเห็นแต่ละลูกที่ TIME/DIV นี้ จึงเห็นเป็นแถบทึบ — ลด TIME/DIV</SimNotice> : null}
      {usesTransformer ? (
        <p className="text-[0.85rem] text-ink-3">
          หม้อแปลง 12 V ในแล็บเป็นแบบจำลองด้านทุติยภูมิเท่านั้น ด้านปฐมภูมิ 230 V และการวัดไฟบ้านด้วยสโคปจริงเป็นการสาธิตของครูเท่านั้น
        </p>
      ) : null}
      <AssumptionsPanel items={ASSUMPTIONS} />
    </div>
  );

  return <LabShell compact={compact} stageLabel={describeScreen(s)} stage={<ScopeStage s={s} rollPhase={roll} />} controls={controls} readouts={readouts} footer={footer} />;
}
