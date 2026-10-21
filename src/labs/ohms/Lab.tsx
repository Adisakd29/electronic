"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LabProps } from "../types";
import { formatSI } from "../shared/format";
import {
  ControlGroup,
  LabButton,
  LabSelect,
  LabShell,
  Plot,
  Readout,
  Segmented,
  SimNotice,
  Slider,
  type PlotSeries,
} from "../shared/ui";
import {
  POWER_RATINGS,
  addPoint,
  bodyBand,
  currentScale,
  distinctRValues,
  ledHint,
  makeState,
  niceCeil,
  powerScale,
  presetConfig,
  sameR,
  solve,
  solveForCurrent,
  tidy,
  voltageForPower,
  type OhmsPoint,
  type PresetConfig,
} from "./model";
import { OhmsStage } from "./Stage";
import { ASSUMPTIONS } from "./assumptions";

type Lock = "none" | "R" | "V";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export default function OhmsLabComponent(props: LabProps) {
  const cfg = presetConfig(props.preset);
  // Remount on preset change so the state resets to the preset's values.
  return <OhmsLab key={cfg.key} cfg={cfg} onState={props.onState} compact={props.compact} />;
}

function OhmsLab({ cfg, onState, compact = false }: { cfg: PresetConfig; onState?: (s: unknown) => void; compact?: boolean }) {
  const [V, setV] = useState(cfg.V);
  const [R, setR] = useState(cfg.R);
  const [points, setPoints] = useState<OhmsPoint[]>([]);
  const [lock, setLock] = useState<Lock>("none");
  const [want, setWant] = useState("");
  const [solveMsg, setSolveMsg] = useState("");
  const [rating, setRating] = useState("0.25");
  const reduced = useReducedMotion();
  const wantId = useId();

  const state = useMemo(() => makeState(V, R, points, cfg.key), [V, R, points, cfg.key]);
  const { I, P } = state;

  // Debounced state emission for the LabRunner checks.
  const cb = useRef(onState);
  useEffect(() => {
    cb.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => cb.current?.(state), 150);
    return () => clearTimeout(t);
  }, [state]);

  const setVoltage = (v: number) => setV(tidy(v));
  const setResistance = (r: number) => setR(tidy(r));

  const doSolve = () => {
    const mA = Number(want.replace(",", "."));
    if (lock === "none") return;
    const r = solveForCurrent(lock, mA / 1000, V, R, cfg);
    if (!r.ok) {
      setSolveMsg(lock === "V" && V <= 0 ? "ตั้ง V ให้มากกว่า 0 ก่อน จึงจะหา R ได้" : "กรอกกระแสเป็นตัวเลขที่มากกว่า 0 (หน่วย mA)");
      return;
    }
    setV(r.V);
    setR(r.R);
    const res = solve(r.V, r.R);
    const formula =
      lock === "R"
        ? `V = I × R = ${formatSI(mA / 1000, "A")} × ${formatSI(R, "Ω")} = ${formatSI(r.V, "V")}`
        : `R = V ÷ I = ${formatSI(V, "V")} ÷ ${formatSI(mA / 1000, "A")} = ${formatSI(r.R, "Ω")}`;
    setSolveMsg(
      r.clamped
        ? `ค่าที่ต้องการอยู่นอกช่วงของห้องทดลอง จึงตั้งเป็นค่าขอบ ${lock === "R" ? formatSI(r.V, "V") : formatSI(r.R, "Ω")} ได้กระแส ${formatSI(res.I, "A")}`
        : `${formula} → กระแส ${formatSI(res.I, "A")}`,
    );
  };

  const record = () => setPoints((p) => addPoint(p, V, R));
  const undo = () => setPoints((p) => p.slice(0, -1));
  const clear = () => setPoints([]);
  const nDistinct = distinctRValues(points).length;

  // ---------- readouts ----------
  const band = cfg.body ? bodyBand(I) : null;
  const led = cfg.led ? ledHint(I) : null;
  const ratingW = Number(rating);
  const over = cfg.power && P > ratingW * (1 + 1e-9);
  const iText = cfg.led || cfg.body ? `${(I * 1000).toFixed(I < 0.01 ? 2 : 1)} mA` : undefined;

  const readouts = (
    <>
      <Readout label="แรงดัน V (Voltage)" value={V} unit="V" />
      <Readout
        label={cfg.body ? "กระแสผ่านร่างกาย I" : "กระแส I (Current)"}
        value={I}
        unit="A"
        text={iText}
        tone={band ? band.tone : led === "high" ? "warn" : "neutral"}
      />
      <Readout label="ความต้านทาน R" value={R} unit="Ω" />
      <Readout label="กำลังไฟฟ้า P = V·I" value={P} unit="W" tone={over ? "danger" : "neutral"} />
      <Readout label="ความชัน 1/R (slope)" text={formatSI(1 / R, "A/V")} />
      {band ? <Readout label="โซนผลกระทบ (ค่าประมาณ IEC 60479-1)" text={band.label} tone={band.tone} /> : null}
      {cfg.power ? <Readout label={`V ที่ถึงพิกัด ${formatSI(ratingW, "W")} = √(P·R)`} value={voltageForPower(ratingW, R)} unit="V" /> : null}
      {cfg.led ? (
        <Readout
          label="ขนาดกระแส LED 5 mm (~2–20 mA)"
          text={led === "high" ? "สูงเกิน 20 mA" : led === "low" ? "ต่ำ อาจหรี่มาก" : "อยู่ในช่วงใช้งาน"}
          tone={led === "high" ? "warn" : led === "ok" ? "ok" : "neutral"}
        />
      ) : null}
    </>
  );

  // ---------- controls ----------
  const controls = (
    <>
      {cfg.body ? (
        <SimNotice tone="danger">
          <strong>จำลองเท่านั้น</strong> — ห้ามทดลองกับไฟบ้าน 230 V หรือเต้ารับจริงโดยเด็ดขาด งานไฟบ้านจริงเป็นงานครูสาธิต (S3)
          ค่ากระแสและโซนผลกระทบเป็น<strong>ค่าประมาณ</strong>จาก IEC 60479-1 (ขอบเขตโดยประมาณ ผลต่อแต่ละบุคคลต่างกัน) ผลลัพธ์เป็นแบบจำลองเพื่อการศึกษา{" "}
          <strong>ไม่ใช่พิกัดความปลอดภัย และไม่ใช่การทำนายผลที่จะเกิดกับบุคคลจริงอย่างแม่นยำ</strong>
        </SimNotice>
      ) : null}
      <ControlGroup title="แหล่งจ่ายและโหลด (Source & Load)">
        <Slider
          label="แรงดัน V (Voltage)"
          value={V}
          onChange={setVoltage}
          min={cfg.Vmin}
          max={cfg.Vmax}
          step={cfg.Vstep}
          unit="V"
          disabled={lock === "V"}
          hint={lock === "V" ? "ล็อกอยู่ — ปลดล็อกเพื่อปรับ" : `ช่วง ${cfg.Vmin}–${cfg.Vmax} V`}
        />
        <Slider
          label={cfg.body ? "ความต้านทานร่างกาย R (body resistance)" : "ความต้านทาน R (Resistance)"}
          value={R}
          onChange={setResistance}
          min={cfg.Rmin}
          max={cfg.Rmax}
          log
          unit="Ω"
          disabled={lock === "R"}
          hint={lock === "R" ? "ล็อกอยู่ — ปลดล็อกเพื่อปรับ" : `สเกลลอการิทึม ${formatSI(cfg.Rmin, "Ω")}–${formatSI(cfg.Rmax, "Ω")} พิมพ์ค่าได้ เช่น 4.7k`}
        />
        {cfg.power ? (
          <LabSelect
            label="พิกัดกำลังตัวต้านทาน (power rating)"
            value={rating}
            onChange={setRating}
            options={POWER_RATINGS.map((w) => ({ value: String(w), label: `${w} W` }))}
          />
        ) : null}
      </ControlGroup>

      <ControlGroup title="ล็อกตัวแปร (Lock & solve)">
        <Segmented<Lock>
          label="ค่าที่ต้องการคงไว้"
          size="sm"
          value={lock}
          onChange={(l) => {
            setLock(l);
            setSolveMsg("");
          }}
          options={[
            { value: "none", label: "ไม่ล็อก" },
            { value: "R", label: "ล็อก R → หา V" },
            { value: "V", label: "ล็อก V → หา R" },
          ]}
        />
        {lock !== "none" ? (
          <div className="space-y-2">
            <label htmlFor={wantId} className="block text-[0.95rem] font-medium text-ink">
              กระแสที่ต้องการ I (mA)
            </label>
            <div className="flex gap-2">
              <input
                id={wantId}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={want}
                onChange={(e) => setWant(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSolve();
                }}
                className="readout h-10 w-full min-w-0 rounded-sm border border-line-strong bg-panel-2 px-2 text-right text-ink"
                placeholder="เช่น 30"
              />
              <LabButton tone="primary" onClick={doSolve} className="shrink-0">
                {lock === "R" ? "หา V" : "หา R"}
              </LabButton>
            </div>
            <p className="text-[0.85rem] text-ink-3">
              {lock === "R" ? `คง R = ${formatSI(R, "Ω")} แล้วคำนวณ V = I × R` : `คง V = ${formatSI(V, "V")} แล้วคำนวณ R = V ÷ I`}
            </p>
            <p aria-live="polite" className="readout text-[0.9rem] text-ink">
              {solveMsg}
            </p>
          </div>
        ) : null}
      </ControlGroup>

      <ControlGroup title="บันทึกข้อมูล (Data)">
        <div className="flex flex-wrap gap-2">
          <LabButton tone="primary" onClick={record}>
            บันทึกจุด
          </LabButton>
          <LabButton onClick={undo} disabled={!points.length}>
            ลบจุดล่าสุด
          </LabButton>
          <LabButton onClick={clear} disabled={!points.length}>
            ล้างทั้งหมด
          </LabButton>
        </div>
        <p aria-live="polite" className="text-[0.9rem] text-ink-2">
          บันทึกแล้ว {points.length} จุด · ค่า R ต่างกัน {nDistinct} ค่า
        </p>
      </ControlGroup>
    </>
  );

  // ---------- plots ----------
  const viPlot = useMemo(() => buildVI(cfg, V, R, points), [cfg, V, R, points]);
  const pvPlot = useMemo(() => (cfg.power ? buildPV(cfg, V, R, points, ratingW) : null), [cfg, V, R, points, ratingW]);

  const footer = (
    <div className="space-y-4">
      <div className={pvPlot && !compact ? "grid gap-4 lg:grid-cols-2" : "space-y-4"}>
        <section className="rounded-md border border-line bg-panel p-3">
          <h3 className="mb-1 font-semibold text-ink">กราฟ V–I (I = V/R)</h3>
          <Plot {...viPlot} height={compact ? 240 : 280} />
        </section>
        {pvPlot ? (
          <section className="rounded-md border border-line bg-panel p-3">
            <h3 className="mb-1 font-semibold text-ink">กราฟ P–V (P = V²/R)</h3>
            <Plot {...pvPlot} height={compact ? 240 : 280} />
          </section>
        ) : null}
      </div>

      {points.length ? (
        <section className="rounded-md border border-line bg-panel p-3">
          <div className="max-h-64 overflow-auto">
            <table className="readout w-full border-collapse text-[0.9rem]">
              <caption className="mb-1 text-left font-sans font-semibold text-ink">ตารางจุดที่บันทึก (recorded points)</caption>
              <thead>
                <tr className="text-ink-2">
                  <th scope="col" className="border-b border-line px-2 py-1 text-left">#</th>
                  <th scope="col" className="border-b border-line px-2 py-1 text-right">V</th>
                  <th scope="col" className="border-b border-line px-2 py-1 text-right">I</th>
                  <th scope="col" className="border-b border-line px-2 py-1 text-right">R</th>
                  <th scope="col" className="border-b border-line px-2 py-1 text-right">P</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr key={i} className="text-ink">
                    <td className="border-b border-line px-2 py-1">{i + 1}</td>
                    <td className="border-b border-line px-2 py-1 text-right">{formatSI(p.V, "V")}</td>
                    <td className="border-b border-line px-2 py-1 text-right">{formatSI(p.I, "A")}</td>
                    <td className="border-b border-line px-2 py-1 text-right">{formatSI(p.R, "Ω")}</td>
                    <td className="border-b border-line px-2 py-1 text-right">{formatSI(p.V * p.I, "W")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {cfg.led ? (
        <SimNotice tone="info">
          แบบจำลองนี้คำนวณเฉพาะตัวต้านทาน ยังไม่หักแรงดันตกคร่อม LED (V<sub>F</sub> ≈ 1.8–3.2 V) กระแสจริงในวงจร LED จึงต่ำกว่าค่าที่แสดง
          (เรียนในสัปดาห์ที่ 13)
        </SimNotice>
      ) : null}
      {over ? (
        <SimNotice tone="danger">
          P = {formatSI(P, "W")} เกินพิกัด {formatSI(ratingW, "W")} — ตัวต้านทานจริงจะร้อนจัดและอาจไหม้ (แล็บไม่จำลองการไหม้)
        </SimNotice>
      ) : null}

      <AssumptionsBox items={ASSUMPTIONS} />
    </div>
  );

  const stageLabel =
    `วงจรแหล่งจ่าย DC ${formatSI(V, "V")} ต่อกับ${cfg.body ? "ร่างกาย (แทนด้วยตัวต้านทาน)" : "ตัวต้านทาน"} ${formatSI(R, "Ω")} ` +
    `แอมมิเตอร์ต่ออนุกรมอ่านได้ ${formatSI(I, "A")} โวลต์มิเตอร์ต่อขนานคร่อม R อ่านได้ ${formatSI(V, "V")}` +
    (band ? ` โซนผลกระทบ: ${band.label}` : "");

  return (
    <LabShell
      compact={compact}
      stageLabel={stageLabel}
      stage={<OhmsStage V={V} R={R} cfg={cfg} animate={!reduced} />}
      readouts={readouts}
      controls={controls}
      footer={footer}
    />
  );
}

function AssumptionsBox({ items }: { items: string[] }) {
  return (
    <section className="rounded-md border border-line bg-panel-2 px-4 py-3" aria-labelledby="ohms-assump">
      <h3 id="ohms-assump" className="font-semibold text-ink">
        ข้อสมมติและขอบเขตความแม่นยำ
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.92rem] text-ink-2">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Plot builders (display units chosen so tick labels read cleanly)
// ---------------------------------------------------------------------------

function buildVI(cfg: PresetConfig, V: number, R: number, points: OhmsPoint[]) {
  const maxA = Math.max(cfg.Vmax / R, ...points.map((p) => p.I));
  const sc = currentScale(maxA);
  const yMax = niceCeil(maxA * sc.factor);
  const others = distinctRValues(points)
    .filter((r) => !sameR(r, R))
    .slice(-3);
  const series: PlotSeries[] = [
    ...others.map<PlotSeries>((r, i) => ({
      name: `เส้น R = ${formatSI(r, "Ω")} (ที่บันทึก)`,
      points: [
        [0, 0],
        [cfg.Vmax, (cfg.Vmax / r) * sc.factor],
      ],
      dashed: true,
      color: ["var(--fig-accent-2)", "var(--fig-muted)", "var(--fig-copper)"][i],
    })),
    {
      name: `I = V/R ที่ R = ${formatSI(R, "Ω")} (ความชัน ${formatSI(1 / R, "A/V")})`,
      points: [
        [0, 0],
        [cfg.Vmax, (cfg.Vmax / R) * sc.factor],
      ],
      color: "var(--fig-accent)",
    },
  ];
  if (points.length)
    series.push({ name: "จุดที่บันทึก", points: points.map((p) => [p.V, p.I * sc.factor]), markers: true, color: "var(--fig-current)" });
  series.push({ name: "จุดทำงานปัจจุบัน", points: [[V, (V / R) * sc.factor]], markers: true, color: "var(--fig-ok)" });
  return {
    series,
    xLabel: "แรงดัน V",
    xUnit: "V",
    yLabel: "กระแส I",
    yUnit: sc.unit,
    xDomain: [0, cfg.Vmax] as [number, number],
    yDomain: [0, yMax] as [number, number],
    title: `กราฟ V–I: เส้นตรงผ่านจุดกำเนิด ความชัน 1/R = ${formatSI(1 / R, "A/V")} จุดทำงาน ${formatSI(V, "V")}, ${formatSI(V / R, "A")} มีจุดที่บันทึก ${points.length} จุด`,
  };
}

function buildPV(cfg: PresetConfig, V: number, R: number, points: OhmsPoint[], rating: number) {
  const P = (V * V) / R;
  const maxW = Math.max(2 * rating, 1.15 * P, ...points.map((p) => p.V * p.I));
  const sc = powerScale(maxW);
  const yMax = niceCeil(maxW * sc.factor);
  const n = 48;
  const curve: [number, number][] = Array.from({ length: n + 1 }, (_, k) => {
    const v = (cfg.Vmax * k) / n;
    return [v, ((v * v) / R) * sc.factor];
  });
  const Vr = voltageForPower(rating, R);
  const series: PlotSeries[] = [{ name: `P = V²/R ที่ R = ${formatSI(R, "Ω")}`, points: curve, color: "var(--fig-accent)" }];
  if (points.length)
    series.push({ name: "จุดที่บันทึก (P = V·I)", points: points.map((p) => [p.V, p.V * p.I * sc.factor]), markers: true, color: "var(--fig-current)" });
  series.push({ name: "จุดทำงานปัจจุบัน", points: [[V, P * sc.factor]], markers: true, color: "var(--fig-ok)" });
  return {
    series,
    xLabel: "แรงดัน V",
    xUnit: "V",
    yLabel: "กำลัง P",
    yUnit: sc.unit,
    xDomain: [0, cfg.Vmax] as [number, number],
    yDomain: [0, yMax] as [number, number],
    hLines: [{ y: rating * sc.factor, label: `พิกัด ${formatSI(rating, "W")}`, color: "var(--fig-danger)" }],
    vLines: Vr <= cfg.Vmax ? [{ x: Vr, label: formatSI(Vr, "V"), color: "var(--fig-danger)" }] : [],
    title: `กราฟ P–V: พาราโบลา P = V²/R ที่ R = ${formatSI(R, "Ω")} ถึงพิกัด ${formatSI(rating, "W")} ที่ V = ${formatSI(Vr, "V")} ขณะนี้ P = ${formatSI(P, "W")}`,
  };
}
