"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LabProps } from "../types";
import { formatSI } from "../shared/format";
import { AssumptionsPanel, ControlGroup, LabButton, LabSelect, LabShell, Plot, Readout, Segmented, SimNotice, Slider, type PlotSeries } from "../shared/ui";
import {
  LED_BURN,
  LED_COLORS,
  LED_RATED,
  MATERIALS,
  V_DIODE,
  diodeCurve,
  ledBrightness,
  ledRawCurrent,
  ledSeriesR,
  presetInputs,
  rectWaveform,
  rippleFreq,
  solveAll,
  solveBjt,
  type BjtLoad,
  type DiodeMaterial,
  type LedColor,
  type RectType,
  type SemiInputs,
  type SemiState,
  type Tab,
} from "./model";
import { SemiStage } from "./Stage";
import { ASSUMPTIONS } from "./meta";

const TABS: { value: Tab; label: string }[] = [
  { value: "diode", label: "ไดโอด" },
  { value: "led", label: "LED" },
  { value: "rect", label: "เรียงกระแส" },
  { value: "bjt", label: "ทรานซิสเตอร์" },
];

const C_OPTIONS = [0, 10e-6, 47e-6, 100e-6, 220e-6, 470e-6, 1000e-6, 2200e-6];

const FLOW_CSS = `
@keyframes semi-flow { from { stroke-dashoffset: 18.1; } to { stroke-dashoffset: 0; } }
.semi-flow { animation: semi-flow 1.4s linear infinite; }
@media (prefers-reduced-motion: reduce) { .semi-flow { animation: none; } }
`;

export default function SemiconductorLab({ preset, onState, compact = false }: LabProps) {
  const [inp, setInp] = useState<SemiInputs>(() => presetInputs(preset));
  // reset when the preset prop changes (state adjustment during render, no effect)
  const [shownPreset, setShownPreset] = useState(preset);
  if (shownPreset !== preset) {
    setShownPreset(preset);
    setInp(presetInputs(preset));
  }

  const state = useMemo(() => solveAll(inp), [inp]);

  // debounced state reporting
  const cb = useRef(onState);
  useEffect(() => {
    cb.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => cb.current?.(state), 200);
    return () => clearTimeout(t);
  }, [state]);

  const set = <K extends keyof SemiInputs>(k: K, patch: Partial<SemiInputs[K]>) =>
    setInp((p) => {
      const next = { ...p, [k]: { ...(p[k] as object), ...patch } } as SemiInputs;
      // LED burns out (latched) as soon as the circuit would push > 30 mA through it
      if (k === "led" && ledRawCurrent(next.led.color, next.led.Vs, next.led.R) > LED_BURN) next.led = { ...next.led, burnt: true };
      return next;
    });

  const plotH = compact ? 220 : 260;

  return (
    <div className="space-y-4">
      <style>{FLOW_CSS}</style>
      <Segmented label="เลือกการทดลอง" value={inp.tab} onChange={(tab) => setInp((p) => ({ ...p, tab }))} options={TABS} />
      <LabShell
        compact={compact}
        stageLabel={stageLabel(state)}
        stage={
          <div className="space-y-2">
            <SemiStage state={state} />
            <TabPlot state={state} height={plotH} />
          </div>
        }
        controls={<Controls inp={inp} state={state} set={set} />}
        readouts={<Readouts state={state} />}
        footer={<AssumptionsPanel items={ASSUMPTIONS} />}
      />
    </div>
  );
}

function stageLabel(s: SemiState): string {
  switch (s.tab) {
    case "led":
      return "แผนภาพวงจร LED และกราฟ I–V พร้อมเส้นโหลด";
    case "rect":
      return "แผนภาพวงจรเรียงกระแสและกราฟรูปคลื่นแรงดันขาเข้าและขาออก";
    case "bjt":
      return "แผนภาพวงจรทรานซิสเตอร์เป็นสวิตช์และกราฟ IC เทียบกับ Vin";
    default:
      return "แผนภาพวงจรไดโอดอนุกรมและกราฟ I–V พร้อมเส้นโหลดและจุดทำงาน";
  }
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

type Setter = <K extends keyof SemiInputs>(k: K, patch: Partial<SemiInputs[K]>) => void;

function Controls({ inp, state, set }: { inp: SemiInputs; state: SemiState; set: Setter }) {
  if (inp.tab === "diode")
    return (
      <ControlGroup title="วงจรไดโอดอนุกรม">
        <LabSelect<DiodeMaterial>
          label="ชนิดไดโอด"
          value={inp.diode.material}
          onChange={(material) => set("diode", { material })}
          options={(Object.keys(MATERIALS) as DiodeMaterial[]).map((m) => ({ value: m, label: MATERIALS[m].label }))}
        />
        <Slider label="แรงดันแหล่งจ่าย Vs" value={inp.diode.Vs} onChange={(Vs) => set("diode", { Vs })} min={-10} max={10} step={0.1} unit="V" hint="ค่าลบ = กลับขั้วแหล่งจ่าย (ไบแอสกลับ)" />
        <Slider label="ตัวต้านทาน R" value={inp.diode.R} onChange={(R) => set("diode", { R })} min={100} max={10000} log unit="Ω" />
        <LabButton onClick={() => set("diode", { Vs: -inp.diode.Vs })}>กลับขั้วแหล่งจ่าย</LabButton>
      </ControlGroup>
    );
  if (inp.tab === "led") {
    const s = state.led;
    return (
      <ControlGroup title="วงจร LED">
        <LabSelect<LedColor>
          label="สีของ LED (VF ทั่วไป)"
          value={inp.led.color}
          onChange={(color) => set("led", { color })}
          options={(Object.keys(LED_COLORS) as LedColor[]).map((c) => ({ value: c, label: LED_COLORS[c].label }))}
        />
        <Slider label="แรงดันแหล่งจ่าย Vs" value={inp.led.Vs} onChange={(Vs) => set("led", { Vs })} min={-5} max={12} step={0.1} unit="V" hint="ค่าลบ = ต่อ LED กลับขั้ว" />
        <Slider label="ตัวต้านทานจำกัดกระแส R" value={inp.led.R} onChange={(R) => set("led", { R })} min={47} max={10000} log unit="Ω" />
        {s.status === "burnt" ? (
          <SimNotice tone="danger">
            <strong>เกินพิกัด – LED เสีย</strong> กระแสเกิน 30 mA ทำให้ LED ขาด (วงจรเปิด ไม่มีกระแส) เพิ่มค่า R ให้ได้ IF ≤ 20 mA แล้วเปลี่ยน LED ใหม่
          </SimNotice>
        ) : s.If > LED_RATED ? (
          <SimNotice tone="warn">กระแส {formatSI(s.If, "A")} เกินพิกัด 20 mA — LED ร้อนและอายุสั้นลง ถ้าเกิน 30 mA จะเสีย</SimNotice>
        ) : null}
        <LabButton tone={s.status === "burnt" ? "primary" : "secondary"} disabled={!inp.led.burnt} onClick={() => set("led", { burnt: false })}>
          เปลี่ยน LED ใหม่
        </LabButton>
      </ControlGroup>
    );
  }
  if (inp.tab === "rect")
    return (
      <ControlGroup title="วงจรเรียงกระแสและตัวกรอง">
        <Segmented<RectType>
          label="ชนิดวงจร"
          size="sm"
          value={inp.rect.type}
          onChange={(type) => set("rect", { type })}
          options={[
            { value: "half", label: "ครึ่งคลื่น" },
            { value: "center-tap", label: "เต็มคลื่นแทปกลาง" },
            { value: "bridge", label: "บริดจ์" },
          ]}
        />
        <Slider
          label={inp.rect.type === "center-tap" ? "แรงดันทุติยภูมิ (ต่อครึ่งขด) rms" : "แรงดันทุติยภูมิ rms"}
          value={inp.rect.Vrms}
          onChange={(Vrms) => set("rect", { Vrms })}
          min={6}
          max={12}
          step={0.5}
          unit="V"
        />
        <Slider label="ตัวต้านทานโหลด RL" value={inp.rect.Rl} onChange={(Rl) => set("rect", { Rl })} min={100} max={10000} log unit="Ω" />
        <LabSelect<string>
          label="ตัวเก็บประจุกรอง C"
          value={String(inp.rect.C)}
          onChange={(v) => set("rect", { C: Number(v) })}
          options={C_OPTIONS.map((c) => ({ value: String(c), label: c === 0 ? "ไม่มี (0)" : formatSI(c, "F") }))}
        />
        <SimNotice tone="info">
          แหล่งจ่าย AC คือขดทุติยภูมิแรงดันต่ำของหม้อแปลง (≤ 12 V AC, 50 Hz) — การต่อฝั่งปฐมภูมิ 230 V เป็นงานที่ครูสาธิตเท่านั้น
        </SimNotice>
      </ControlGroup>
    );
  return (
    <ControlGroup title="ทรานซิสเตอร์ NPN เป็นสวิตช์">
      <LabSelect<BjtLoad>
        label="โหลดที่ขาคอลเลกเตอร์"
        value={inp.bjt.load}
        onChange={(load) => set("bjt", { load })}
        options={[
          { value: "resistor", label: "ตัวต้านทาน RC" },
          { value: "led", label: "LED แดง + RC" },
          { value: "relay", label: "คอยล์รีเลย์ (RC = ความต้านทานคอยล์)" },
        ]}
      />
      <Slider label="แรงดันแหล่งจ่าย Vcc" value={inp.bjt.Vcc} onChange={(Vcc) => set("bjt", { Vcc })} min={5} max={12} step={0.5} unit="V" />
      <Slider label="แรงดันอินพุต Vin" value={inp.bjt.Vin} onChange={(Vin) => set("bjt", { Vin })} min={0} max={5} step={0.05} unit="V" />
      <Slider label="ตัวต้านทานเบส RB" value={inp.bjt.Rb} onChange={(Rb) => set("bjt", { Rb })} min={1000} max={100000} log unit="Ω" />
      <Slider label={inp.bjt.load === "relay" ? "ความต้านทานคอยล์ RC" : "ตัวต้านทานคอลเลกเตอร์ RC"} value={inp.bjt.Rc} onChange={(Rc) => set("bjt", { Rc })} min={100} max={10000} log unit="Ω" />
      <Slider label="อัตราขยายกระแส β (hFE)" value={inp.bjt.beta} onChange={(beta) => set("bjt", { beta })} min={50} max={300} step={10} format={(v) => String(Math.round(v))} />
      <div className="flex gap-2">
        <LabButton onClick={() => set("bjt", { Vin: 0 })}>Vin = 0 V</LabButton>
        <LabButton onClick={() => set("bjt", { Vin: 5 })}>Vin = 5 V</LabButton>
      </div>
    </ControlGroup>
  );
}

// ---------------------------------------------------------------------------
// Readouts
// ---------------------------------------------------------------------------

function Readouts({ state }: { state: SemiState }) {
  if (state.tab === "diode") {
    const d = state.diode;
    const I = Math.max(0, d.Id);
    return (
      <>
        <Readout label="สถานะไบแอส" text={d.bias === "forward" ? "ไบแอสตรง" : "ไบแอสกลับ"} tone={d.bias === "forward" ? "ok" : "neutral"} />
        <Readout label="กระแส ID" text={d.Id > 1e-9 ? formatSI(d.Id, "A") : "≈ 0 A"} />
        <Readout label="แรงดันคร่อมไดโอด VD" value={d.Vd} unit="V" />
        <Readout label="แรงดันคร่อม R (VR)" value={I > 1e-9 ? d.Id * d.R : 0} unit="V" />
        <Readout label="กำลังที่ไดโอด PD" value={I * Math.max(0, d.Vd)} unit="W" />
      </>
    );
  }
  if (state.tab === "led") {
    const l = state.led;
    const tone = l.status === "burnt" ? "danger" : l.If > LED_RATED || l.status === "dim" ? "warn" : l.status === "ok" ? "ok" : "neutral";
    const st = { off: "ไม่ติด", dim: "ติดหรี่", ok: "ติดปกติ", burnt: "เสีย (ขาด)" }[l.status];
    const Rrec = ledSeriesR(l.Vs, l.Vf, LED_RATED);
    return (
      <>
        <Readout label="สถานะ LED" text={st} tone={tone} />
        <Readout label="กระแส IF" value={l.If} unit="A" tone={tone} />
        <Readout label="แรงดัน VF" value={l.status === "ok" || l.status === "dim" ? l.Vf : 0} unit="V" />
        <Readout label="ความสว่าง (เทียบพิกัด)" text={`${Math.round(ledBrightness(l) * 100)} %`} />
        <Readout label="R ที่ควรใช้ (20 mA)" text={Number.isFinite(Rrec) ? formatSI(Rrec, "Ω") : "—"} />
        <Readout label="กำลังที่ R" value={l.If * l.If * l.R} unit="W" />
      </>
    );
  }
  if (state.tab === "rect") {
    const r = state.rect;
    const VpIn = r.Vrms * Math.SQRT2;
    const piv = r.type === "center-tap" ? 2 * VpIn - V_DIODE : r.type === "bridge" ? VpIn - V_DIODE : VpIn;
    return (
      <>
        <Readout label="Vp ขาเข้า (Vrms·√2)" value={VpIn} unit="V" />
        <Readout label="Vp ขาออก" value={r.Vp} unit="V" />
        <Readout label="VDC ขาออก" value={r.Vdc} unit="V" tone="ok" />
        <Readout label={`ริปเปิล p-p (fr = ${rippleFreq(r.type)} Hz)`} value={r.ripple} unit="V" tone={r.C > 0 ? "neutral" : "warn"} />
        <Readout label="กระแสโหลด IDC" value={r.Vdc / r.Rl} unit="A" />
        <Readout label="PIV ต่อไดโอด" value={piv} unit="V" />
      </>
    );
  }
  const b = state.bjt;
  const region = { cutoff: "คัตออฟ", active: "แอกทีฟ", saturation: "อิ่มตัว" }[b.region];
  return (
    <>
      <Readout label="ย่านการทำงาน" text={region} tone={b.region === "saturation" ? "ok" : b.region === "active" ? "warn" : "neutral"} />
      <Readout label="IB" value={b.Ib} unit="A" />
      <Readout label="β·IB" value={b.beta * b.Ib} unit="A" />
      <Readout label="IC(sat)" value={b.IcSat} unit="A" />
      <Readout label="IC" value={b.Ic} unit="A" />
      <Readout label="VCE" value={b.Vce} unit="V" />
      <Readout label="IB ต่ำสุดที่อิ่มตัว" value={b.IcSat / b.beta} unit="A" />
      <Readout label="กำลังที่ทรานซิสเตอร์" value={b.Vce * b.Ic} unit="W" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Plots
// ---------------------------------------------------------------------------

function TabPlot({ state, height }: { state: SemiState; height: number }) {
  if (state.tab === "diode") {
    const d = state.diode;
    const fwd = d.Vs >= 0;
    const iMax = Math.max(Math.abs(d.Vs) / d.R, 1e-4) * 1.15;
    const x0 = fwd ? -0.2 : d.Vs * 1.1;
    const x1 = fwd ? Math.max(1, d.Vd + 0.3) : 1;
    const y: [number, number] = fwd ? [0, iMax] : [-iMax, iMax * 0.3];
    const series: PlotSeries[] = [
      { name: `เส้นโค้ง I–V ไดโอด ${MATERIALS[d.material].label}`, points: diodeCurve(d.material, x0, x1, iMax * 2, 300), color: "var(--fig-accent)" },
      { name: "เส้นโหลด I = (Vs − V)/R", points: [[0, d.Vs / d.R], [d.Vs, 0]], color: "var(--fig-current)", dashed: true },
      { name: `จุดทำงาน Q (${formatSI(d.Vd, "V")}, ${d.Id > 1e-9 ? formatSI(d.Id, "A") : "≈ 0 A"})`, points: [[d.Vd, d.Id]], color: "var(--fig-ok)", markers: true },
    ];
    return (
      <Plot
        title={`กราฟ I–V ของไดโอดพร้อมเส้นโหลด จุดทำงานที่ VD ${formatSI(d.Vd, "V")} ID ${formatSI(Math.max(0, d.Id), "A")}`}
        series={series}
        xLabel="แรงดันไดโอด VD"
        xUnit="V"
        yLabel="กระแส ID"
        yUnit="A"
        xDomain={[x0, x1]}
        yDomain={y}
        height={height}
      />
    );
  }
  if (state.tab === "led") {
    const l = state.led;
    const vMax = Math.max(4, l.Vs + 0.5);
    const vMin = Math.min(-1, l.Vs - 0.5);
    const series: PlotSeries[] = [
      { name: `LED (ประมาณแบบช่วงต่อ VF = ${l.Vf} V)`, points: [[vMin, 0], [l.Vf, 0], [l.Vf, 0.05]], color: "var(--fig-accent)" },
      { name: "เส้นโหลด I = (Vs − V)/R", points: [[0, l.Vs / l.R], [l.Vs, 0]], color: "var(--fig-current)", dashed: true },
    ];
    if (l.status !== "burnt") series.push({ name: "จุดทำงาน", points: [[l.If > 0 ? l.Vf : l.Vs, l.If]], color: "var(--fig-ok)", markers: true });
    return (
      <Plot
        title={`กราฟ I–V ของ LED พร้อมเส้นโหลด กระแส ${formatSI(l.If, "A")}`}
        series={series}
        xLabel="แรงดันคร่อม LED"
        xUnit="V"
        yLabel="กระแส IF"
        yUnit="A"
        xDomain={[vMin, vMax]}
        yDomain={[0, 0.04]}
        hLines={[
          { y: LED_RATED, label: "พิกัด 20 mA", color: "var(--fig-warn)" },
          { y: LED_BURN, label: "เสีย > 30 mA", color: "var(--fig-danger)" },
        ]}
        height={height}
      />
    );
  }
  if (state.tab === "rect") {
    const r = state.rect;
    const w = rectWaveform(r.type, r.Vrms, r.Rl, r.C, 2, 400);
    const Vp = r.Vrms * Math.SQRT2;
    return (
      <Plot
        title={`รูปคลื่นแรงดันขาเข้าและขาออก 2 ไซเคิลที่ 50 Hz VDC ประมาณ ${formatSI(r.Vdc, "V")}`}
        series={[
          { name: r.type === "center-tap" ? "ขาเข้า (ครึ่งขดทุติยภูมิ)" : "ขาเข้า (ทุติยภูมิ)", points: w.map((p) => [p.t * 1000, p.vin]), color: "var(--fig-muted)", dashed: true },
          { name: "ขาออก (คร่อม RL)", points: w.map((p) => [p.t * 1000, p.vout]), color: "var(--fig-accent)" },
        ]}
        xLabel="เวลา"
        xUnit="ms"
        yLabel="แรงดัน"
        yUnit="V"
        xDomain={[0, 40]}
        yDomain={[-Vp * 1.1, Vp * 1.1]}
        hLines={[{ y: r.Vdc, label: `VDC ≈ ${formatSI(r.Vdc, "V")}`, color: "var(--fig-ok)" }]}
        height={height}
      />
    );
  }
  const b = state.bjt;
  const pts: [number, number][] = [];
  for (let k = 0; k <= 200; k++) {
    const vin = (5 * k) / 200;
    pts.push([vin, solveBjt(b.Vcc, vin, b.Rb, b.Rc, b.beta, b.load).Ic]);
  }
  return (
    <Plot
      title={`กราฟกระแสคอลเลกเตอร์เทียบกับแรงดันอินพุต จุดปัจจุบัน Vin ${formatSI(b.Vin, "V")} IC ${formatSI(b.Ic, "A")}`}
      series={[
        { name: "IC เทียบ Vin", points: pts, color: "var(--fig-accent)" },
        { name: "จุดทำงานปัจจุบัน", points: [[b.Vin, b.Ic]], color: "var(--fig-ok)", markers: true },
      ]}
      xLabel="แรงดันอินพุต Vin"
      xUnit="V"
      yLabel="กระแส IC"
      yUnit="A"
      xDomain={[0, 5]}
      yDomain={[0, Math.max(b.IcSat, 1e-4) * 1.2]}
      vLines={[{ x: 0.7, label: "0.7 V" }]}
      hLines={[{ y: b.IcSat, label: "IC(sat)", color: "var(--fig-ok)" }]}
      height={height}
    />
  );
}
