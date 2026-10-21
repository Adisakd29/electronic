"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { LabProps } from "../types";
import {
  AssumptionsPanel,
  ControlGroup,
  LabButton,
  LabSelect,
  LabShell,
  Plot,
  Readout,
  Segmented,
  SimNotice,
  Slider,
  Toggle,
  type PlotSeries,
} from "../shared/ui";
import { formatSI } from "../shared/format";
import {
  LIMITS,
  RATINGS,
  T_END_TAU,
  analyzeCombo,
  buildState,
  energy,
  icAt,
  presetConfig,
  rcSnapshot,
  vcAt,
  type ComboType,
  type RcMode,
} from "./model";
import { ASSUMPTIONS } from "./content";
import { ComboStage, RcStage } from "./Stage";

const SPEEDS = [0.001, 0.01, 0.1, 1, 10, 100];
const N_POINTS = 241;
/** Plot geometry of the shared kit (viewBox 600 wide, margins l 64 / r 16). */
const PLOT_W = 600;
const PLOT_ML = 64;
const PLOT_MR = 16;

function speedLabel(s: number) {
  return `×${s < 1 ? String(s) : s}`;
}

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

export default function CapacitorLab({ preset, onState, compact = false }: LabProps) {
  const cfg = presetConfig(preset);
  const [tab, setTab] = useState<"rc" | "combo">(cfg.tab);
  const [V, setV] = useState(cfg.V);
  const [R, setR] = useState(cfg.R);
  const [C, setC] = useState(cfg.C);
  const [rating, setRating] = useState(cfg.rating);
  const [mode, setMode] = useState<RcMode>(cfg.mode);
  const [v0, setV0] = useState(cfg.mode === "charge" ? 0 : cfg.V);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cursorFrac, setCursorFrac] = useState(1 / T_END_TAU);
  const [comboType, setComboType] = useState<ComboType>(cfg.comboType);
  const [comboC, setComboC] = useState<number[]>(() => [...cfg.comboC, 470e-6].slice(0, 3));
  const [use3, setUse3] = useState(cfg.comboC.length >= 3);
  const reduced = usePrefersReducedMotion();
  const [allowAnim, setAllowAnim] = useState(false);
  const animate = !reduced || allowAnim;

  const snap = rcSnapshot({ V, R, C, mode, v0, t });
  const tau = snap.tau;
  const tEnd = T_END_TAU * tau;
  const done = t >= tEnd - 1e-12;

  // ---- reset rules -------------------------------------------------------
  const restart = useCallback((m: RcMode, Vsrc: number) => {
    setRunning(false);
    setT(0);
    setV0(m === "charge" ? 0 : Vsrc);
  }, []);
  const changeV = (x: number) => {
    setV(x);
    restart(mode, x);
  };
  const changeR = (x: number) => {
    setR(x);
    restart(mode, V);
  };
  const changeC = (x: number) => {
    setC(x);
    restart(mode, V);
  };
  /** Moving the switch keeps the capacitor voltage (it cannot jump). */
  const changeMode = (m: RcMode) => {
    if (m === mode) return;
    setV0(snap.vc);
    setT(0);
    setMode(m);
  };

  // ---- animation ---------------------------------------------------------
  const tEndRef = useRef(tEnd);
  const tRef = useRef(t);
  const speedRef = useRef(speed);
  useEffect(() => {
    tEndRef.current = tEnd;
    tRef.current = t;
    speedRef.current = speed;
  }, [tEnd, t, speed]);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    const step = (now: number) => {
      if (last !== null) {
        const dt = Math.min(0.1, (now - last) / 1000) * speedRef.current;
        const nt = Math.min(tEndRef.current, tRef.current + dt);
        tRef.current = nt;
        setT(nt);
        if (nt >= tEndRef.current) {
          setRunning(false);
          return;
        }
      }
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const play = () => {
    if (done) setT(0);
    setRunning(true);
  };
  const jumpTo = (tt: number) => {
    setRunning(false);
    setT(Math.min(tEnd, Math.max(0, tt)));
  };

  // ---- combo -------------------------------------------------------------
  const comboList = use3 ? comboC : comboC.slice(0, 2);
  const combo = analyzeCombo(comboType, comboList, V);
  const setComboAt = (i: number, x: number) => setComboC((arr) => arr.map((c, j) => (j === i ? x : c)));
  const ceqInRange = combo.Ceq >= LIMITS.C[0] * 0.9995 && combo.Ceq <= LIMITS.C[1] * 1.0005;

  // ---- observable state (throttled + trailing) ---------------------------
  const state = buildState({ V, R, C, mode, v0, t }, { type: comboType, C: comboList }, tab);
  const stateKey = JSON.stringify(state);
  const lastEmit = useRef(0);
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);
  useEffect(() => {
    if (!onStateRef.current) return;
    const emit = () => {
      lastEmit.current = Date.now();
      onStateRef.current?.(JSON.parse(stateKey));
    };
    const wait = 200 - (Date.now() - lastEmit.current);
    if (wait <= 0) {
      emit();
      return;
    }
    const id = setTimeout(emit, wait);
    return () => clearTimeout(id);
  }, [stateKey]);

  // ---- plot data ---------------------------------------------------------
  const curves = useMemo(() => {
    const vFull: [number, number][] = [];
    const iFull: [number, number][] = [];
    for (let k = 0; k < N_POINTS; k++) {
      const tt = (k / (N_POINTS - 1)) * tEnd;
      vFull.push([tt, vcAt(mode, V, v0, tt, tau)]);
      iFull.push([tt, icAt(mode, V, v0, tt, R, tau)]);
    }
    return { vFull, iFull };
  }, [mode, V, v0, tau, R, tEnd]);
  const traced = (full: [number, number][], f: (tt: number) => number): [number, number][] => {
    const pts = full.filter((p) => p[0] <= t);
    if (t > 0) pts.push([t, f(t)]);
    return pts;
  };
  const vTr = traced(curves.vFull, (tt) => vcAt(mode, V, v0, tt, tau));
  const iTr = traced(curves.iFull, (tt) => icAt(mode, V, v0, tt, R, tau));
  const vSeries: PlotSeries[] = [
    { name: "เส้นโค้งตามทฤษฎี (ทั้งช่วง)", points: curves.vFull, color: "var(--fig-muted)", dashed: true },
    { name: "v_C ตามเวลาที่ผ่านไป", points: vTr.length ? vTr : [[0, v0]], color: "var(--fig-accent)" },
  ];
  const iSeries: PlotSeries[] = [
    { name: "เส้นโค้งตามทฤษฎี (ทั้งช่วง)", points: curves.iFull, color: "var(--fig-muted)", dashed: true },
    { name: "i ตามเวลาที่ผ่านไป", points: iTr.length ? iTr : [[0, curves.iFull[0][1]]], color: "var(--fig-current)" },
  ];
  const tauLines = [1, 2, 3, 4, 5].map((k) => ({ x: k * tau, label: `${k}τ`, color: "var(--fig-accent-2)" }));
  const v1tau = vcAt(mode, V, v0, tau, tau);
  const vH =
    mode === "charge"
      ? [
          { y: V, label: `V = ${formatSI(V, "V")}`, color: "var(--fig-muted)" },
          { y: v1tau, label: v0 === 0 ? "63.2 % (1τ)" : "ที่ 1τ", color: "var(--fig-accent-2)" },
        ]
      : v0 > 0
        ? [{ y: v1tau, label: "36.8 % (1τ)", color: "var(--fig-accent-2)" }]
        : [];
  const iMax = Math.max(1e-12, (V / R) * 1.1);
  const iDomain: [number, number] = mode === "charge" ? [0, iMax] : [-iMax, 0];

  const cursorT = Math.min(1, Math.max(0, cursorFrac)) * tEnd;
  const cur = rcSnapshot({ V, R, C, mode, v0, t: cursorT });
  const dragFrom = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width <= 0) return;
    const xv = ((e.clientX - r.left) / r.width) * PLOT_W;
    setCursorFrac(Math.min(1, Math.max(0, (xv - PLOT_ML) / (PLOT_W - PLOT_ML - PLOT_MR))));
  };
  const plotH = compact ? 200 : 240;

  const pctLabel = mode === "charge" ? "% ของ V (ประจุแล้ว)" : "% ที่เหลือ (เทียบ V₀)";
  const over = tab === "rc" ? V > rating : combo.Vk.some((v) => v > rating);
  const runSeconds = tEnd / speed;

  // ---- render ------------------------------------------------------------
  const stage =
    tab === "rc" ? (
      <RcStage V={V} R={R} C={C} mode={mode} t={t} tau={tau} vc={snap.vc} ic={snap.ic} rating={rating} />
    ) : (
      <ComboStage combo={combo} V={V} rating={rating} />
    );

  const readouts =
    tab === "rc" ? (
      <>
        <Readout label="ค่าคงที่เวลา τ = RC" value={tau} unit="s" />
        <Readout label="เวลา t (หลังสับสวิตช์)" text={`${formatSI(t, "s")} = ${(t / tau).toFixed(2)}τ`} />
        <Readout label="แรงดันตัวเก็บประจุ v_C" value={snap.vc} unit="V" />
        <Readout label={pctLabel} text={`${snap.percent.toFixed(1)} %`} />
        <Readout
          label={snap.ic >= 0 ? "กระแส i (ไหลเข้าขั้ว +)" : "กระแส i (ไหลออกจากขั้ว +)"}
          value={Math.abs(snap.ic) < 1e-12 ? 0 : snap.ic}
          unit="A"
        />
        <Readout label="พลังงานสะสม ½Cv²" value={energy(C, snap.vc)} unit="J" />
      </>
    ) : (
      <>
        <Readout label={comboType === "series" ? "C_eq (อนุกรม)" : "C_eq (ขนาน)"} value={combo.Ceq} unit="F" digits={4} />
        <Readout label="ประจุรวมจากแหล่งจ่าย Q" value={combo.Qtotal} unit="C" />
        <Readout label="พลังงานรวม ½C_eq·V²" value={energy(combo.Ceq, V)} unit="J" />
        {combo.C.map((c, i) => (
          <Readout
            key={i}
            label={`C${i + 1} = ${formatSI(c, "F")}`}
            text={`${formatSI(combo.Vk[i], "V")} · ${formatSI(combo.Q[i], "C")}`}
            tone={combo.Vk[i] > rating ? "danger" : "neutral"}
          />
        ))}
      </>
    );

  const controls = (
    <>
      <Segmented
        label="ส่วนของห้องทดลอง"
        value={tab}
        onChange={(v) => {
          setRunning(false);
          setTab(v);
        }}
        options={[
          { value: "rc", label: "ประจุ–คายประจุ" },
          { value: "combo", label: "ต่อหลายตัว" },
        ]}
      />
      <ControlGroup title="แหล่งจ่ายและตัวเก็บประจุ">
        <Slider label="แรงดันแหล่งจ่าย V" value={V} onChange={changeV} min={LIMITS.V[0]} max={LIMITS.V[1]} step={0.5} unit="V" />
        <LabSelect
          label="พิกัดแรงดันตัวเก็บประจุ (พิมพ์บนตัว)"
          value={String(rating)}
          onChange={(v) => setRating(Number(v))}
          options={RATINGS.map((r) => ({ value: String(r), label: `${r} V` }))}
        />
      </ControlGroup>
      {tab === "rc" ? (
        <>
          <ControlGroup title="วงจร RC">
            <Slider label="ความต้านทาน R" value={R} onChange={changeR} min={LIMITS.R[0]} max={LIMITS.R[1]} log unit="Ω" />
            <Slider label="ความจุ C" value={C} onChange={changeC} min={LIMITS.C[0]} max={LIMITS.C[1]} log unit="F" />
            <Segmented
              label="ตำแหน่งสวิตช์ S"
              value={mode}
              onChange={changeMode}
              options={[
                { value: "charge", label: "ประจุ (ต่อแหล่งจ่าย)" },
                { value: "discharge", label: "คายประจุ (ต่อ 0 V)" },
              ]}
            />
          </ControlGroup>
          <ControlGroup title="เวลา">
            <LabSelect
              label="ความเร็วของเวลา"
              value={String(speed)}
              onChange={(v) => setSpeed(Number(v))}
              options={SPEEDS.map((s) => ({ value: String(s), label: `${speedLabel(s)}${s === 1 ? " (เวลาจริง)" : ""}` }))}
            />
            <p className="text-[0.82rem] text-ink-3">
              ครบ {T_END_TAU}τ ใช้เวลาบนจอ {formatSI(runSeconds, "s")}
              {runSeconds > 90 ? " — ช้ามาก ลองเพิ่มความเร็ว" : runSeconds < 1.5 ? " — เร็วมาก ลองลดความเร็ว" : ""}
            </p>
            {reduced ? (
              <Toggle
                label="แสดงแบบเคลื่อนไหว"
                checked={allowAnim}
                onChange={setAllowAnim}
                description="ระบบตั้งค่าลดการเคลื่อนไหวไว้ ใช้ปุ่มก้าวทีละขั้นหรือแสดงผลทันทีแทนได้"
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {animate ? (
                running ? (
                  <LabButton tone="primary" onClick={() => setRunning(false)}>
                    ⏸ หยุดชั่วคราว
                  </LabButton>
                ) : (
                  <LabButton tone="primary" onClick={play}>
                    ▶ {done ? "เล่นใหม่" : t > 0 ? "เล่นต่อ" : "เริ่ม"}
                  </LabButton>
                )
              ) : (
                <LabButton tone="primary" onClick={() => jumpTo(tEnd)}>
                  แสดงผลทันที ({T_END_TAU}τ)
                </LabButton>
              )}
              <LabButton onClick={() => jumpTo(t + 0.5 * tau)} disabled={done}>
                ก้าว +0.5τ
              </LabButton>
              <LabButton onClick={() => restart(mode, V)}>↺ รีเซ็ต</LabButton>
            </div>
            <div role="group" aria-label="ข้ามไปที่เวลา" className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[0.85rem] text-ink-2">ไปที่</span>
              {[1, 2, 3, 4, 5].map((k) => (
                <LabButton key={k} className="h-9 px-2.5" onClick={() => jumpTo(k * tau)} pressed={Math.abs(t - k * tau) < tau * 1e-9}>
                  {k}τ
                </LabButton>
              ))}
            </div>
          </ControlGroup>
        </>
      ) : (
        <ControlGroup title="ตัวเก็บประจุหลายตัว">
          <Segmented
            label="วิธีต่อ"
            value={comboType}
            onChange={setComboType}
            options={[
              { value: "series", label: "อนุกรม" },
              { value: "parallel", label: "ขนาน" },
            ]}
          />
          <Slider label="C1" value={comboC[0]} onChange={(x) => setComboAt(0, x)} min={LIMITS.C[0]} max={LIMITS.C[1]} log unit="F" />
          <Slider label="C2" value={comboC[1]} onChange={(x) => setComboAt(1, x)} min={LIMITS.C[0]} max={LIMITS.C[1]} log unit="F" />
          <Toggle label="ใช้ตัวที่ 3 (C3)" checked={use3} onChange={setUse3} />
          {use3 ? (
            <Slider label="C3" value={comboC[2]} onChange={(x) => setComboAt(2, x)} min={LIMITS.C[0]} max={LIMITS.C[1]} log unit="F" />
          ) : null}
          <LabButton
            disabled={!ceqInRange}
            onClick={() => {
              changeC(combo.Ceq);
              setTab("rc");
            }}
          >
            ใช้ C_eq เป็น C ในวงจร RC
          </LabButton>
          {!ceqInRange ? <p className="text-[0.82rem] text-ink-3">C_eq อยู่นอกช่วง 1 µF–4700 µF ของวงจร RC</p> : null}
        </ControlGroup>
      )}
    </>
  );

  const cursorText = `t = ${formatSI(cursorT, "s")} (${(cursorT / tau).toFixed(2)}τ) · v_C = ${formatSI(cur.vc, "V")} = ${(
    (cur.vc / V) *
    100
  ).toFixed(1)} % ของ V · i = ${formatSI(Math.abs(cur.ic) < 1e-12 ? 0 : cur.ic, "A")}`;

  const footer = (
    <div className="space-y-3">
      {tab === "rc" ? (
        <section aria-label="กราฟแรงดันและกระแสตามเวลา" className="space-y-2 rounded-md border border-line bg-panel p-3">
          <div className={compact ? "space-y-2" : "grid gap-3 xl:grid-cols-2"}>
            <div className="cursor-ew-resize select-none" style={{ touchAction: "pan-y" }} onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                dragFrom(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons & 1) dragFrom(e);
              }}
            >
              <Plot
                title={`กราฟแรงดัน v_C เทียบเวลา ${mode === "charge" ? "ขณะประจุ" : "ขณะคายประจุ"} τ = ${formatSI(tau, "s")}`}
                series={vSeries}
                xLabel="เวลา t"
                xUnit="s"
                yLabel="v_C"
                yUnit="V"
                xDomain={[0, tEnd]}
                yDomain={[0, V * 1.1]}
                height={plotH}
                vLines={tauLines}
                hLines={vH}
                cursorX={cursorT}
              />
            </div>
            <div className="cursor-ew-resize select-none" style={{ touchAction: "pan-y" }} onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                dragFrom(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons & 1) dragFrom(e);
              }}
            >
              <Plot
                title={`กราฟกระแส i เทียบเวลา (ค่าลบ = ไหลออกจากตัวเก็บประจุ)`}
                series={iSeries}
                xLabel="เวลา t"
                xUnit="s"
                yLabel="i"
                yUnit="A"
                xDomain={[0, tEnd]}
                yDomain={iDomain}
                height={plotH}
                vLines={tauLines}
                cursorX={cursorT}
              />
            </div>
          </div>
          <Slider
            label="เคอร์เซอร์บนกราฟ (ลากบนกราฟได้)"
            value={cursorT}
            onChange={(x) => setCursorFrac(tEnd > 0 ? x / tEnd : 0)}
            min={0}
            max={tEnd}
            step={tEnd / 600}
            unit="s"
          />
          <p className="readout rounded-sm border border-line bg-panel-2 px-3 py-2 text-[0.92rem] text-ink" aria-live="polite">
            {cursorText}
          </p>
        </section>
      ) : (
        <SimNotice tone="info">
          {comboType === "series"
            ? "อนุกรม: 1/C_eq = 1/C1 + 1/C2 (+ 1/C3) — ทุกตัวมีประจุ Q เท่ากัน แรงดันแบ่งกลับตามค่า C (ตัวค่าน้อยรับแรงดันมากที่สุด) และ C_eq น้อยกว่าตัวที่น้อยที่สุดเสมอ"
            : "ขนาน: C_eq = C1 + C2 (+ C3) — ทุกตัวมีแรงดันเท่ากับแหล่งจ่าย ประจุแบ่งตามค่า C"}
        </SimNotice>
      )}
      {over ? (
        <SimNotice tone="danger">
          {tab === "rc"
            ? `แรงดันแหล่งจ่าย ${formatSI(V, "V")} เกินพิกัด ${formatSI(rating, "V")} ของตัวเก็บประจุ`
            : `แรงดันบนตัวเก็บประจุบางตัวเกินพิกัด ${formatSI(rating, "V")}`}{" "}
          — ในงานจริงห้ามทำ ตัวเก็บประจุอาจร้อน บวม หรือระเบิดได้ ให้เลือกตัวที่มีพิกัดสูงกว่าแรงดันใช้งานอย่างน้อย 20 % (แบบจำลองยังคำนวณแบบอุดมคติเพื่อการเรียนรู้เท่านั้น)
        </SimNotice>
      ) : null}
      <SimNotice tone="warn">
        <strong>ความปลอดภัย:</strong> ตัวเก็บประจุอิเล็กโทรไลต์มีขั้ว — ต่อขา + (ขายาว) เข้าด้านศักย์สูง ขา − (ด้านที่มีแถบ) เข้าด้านศักย์ต่ำ ห้ามต่อกลับขั้ว
        และห้ามใช้แรงดันเกินพิกัดที่พิมพ์บนตัว ตัวเก็บประจุที่ประจุไว้ยังเก็บพลังงานแม้ถอดแหล่งจ่ายแล้ว ให้คายประจุผ่านตัวต้านทานก่อนจับขาหรือถอดจากวงจร
      </SimNotice>
      <AssumptionsPanel items={ASSUMPTIONS} />
    </div>
  );

  const stageLabel =
    tab === "rc"
      ? `วงจร RC สวิตช์อยู่ที่${mode === "charge" ? "ประจุ" : "คายประจุ"} แรงดันตัวเก็บประจุ ${formatSI(snap.vc, "V")} กระแส ${formatSI(Math.abs(snap.ic), "A")}`
      : `ตัวเก็บประจุ ${combo.C.length} ตัวต่อ${comboType === "series" ? "อนุกรม" : "ขนาน"} C_eq = ${formatSI(combo.Ceq, "F")}`;

  return <LabShell compact={compact} stage={stage} controls={controls} readouts={readouts} footer={footer} stageLabel={stageLabel} />;
}
