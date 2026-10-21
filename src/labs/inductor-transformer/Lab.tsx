"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
} from "../shared/ui";
import { formatSI } from "../shared/format";
import type { LabProps } from "../types";
import {
  CORES,
  ELV_AC,
  LIMITS,
  SATURATION_B,
  computeState,
  isShortCoil,
  presetInputs,
  rlCurrent,
  rlInductorVoltage,
  shortCoilFactor,
  type CoreKind,
  type InductorInput,
  type LabInputs,
  type Polarity,
  type Tab,
  type TransformerInput,
} from "./model";
import { InductorStage, PolarityDiagram, STAGE_CSS, TransformerStage } from "./Stage";
import { ASSUMPTIONS } from "./assumptions";

const PLAY_SECONDS = 4; // wall-clock duration of a 0 → 5τ playback

const RM_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeRM,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(RM_QUERY).matches : false),
    () => false,
  );
}

export default function InductorTransformerLab({ preset, onState, compact = false }: LabProps) {
  const [inp, setInp] = useState<LabInputs>(() => presetInputs(preset));
  const [playing, setPlaying] = useState(false);
  const [prevPreset, setPrevPreset] = useState(preset);
  const reduced = usePrefersReducedMotion();

  if (preset !== prevPreset) {
    setPrevPreset(preset);
    setInp(presetInputs(preset));
    setPlaying(false);
  }

  const state = useMemo(() => computeState(inp), [inp]);
  const ind = state.inductor;
  const tr = state.transformer;

  // latest values for callbacks / animation loop
  const onStateRef = useRef(onState);
  const tauRef = useRef(ind.tau);
  const tRef = useRef(ind.t);
  useEffect(() => {
    onStateRef.current = onState;
    tauRef.current = ind.tau;
    tRef.current = ind.t;
  });

  // debounced state reporting
  useEffect(() => {
    const id = setTimeout(() => onStateRef.current?.(state), 150);
    return () => clearTimeout(id);
  }, [state]);

  const setTab = (tab: Tab) => setInp((p) => ({ ...p, tab }));
  const setInd = (patch: Partial<InductorInput>) =>
    setInp((p) => {
      const next = { ...p.inductor, ...patch };
      const tau = computeState({ ...p, inductor: next }).inductor.tau;
      if (!("t" in patch) && next.t > 5 * tau) next.t = 5 * tau;
      return { ...p, inductor: next };
    });
  const setTr = (patch: Partial<TransformerInput>) => setInp((p) => ({ ...p, transformer: { ...p.transformer, ...patch } }));

  // RL playback 0 → 5τ
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const end = 5 * tauRef.current;
      const t = Math.min(end, tRef.current + (dt / PLAY_SECONDS) * end);
      tRef.current = t;
      const done = t >= end;
      setInp((p) => ({ ...p, inductor: { ...p.inductor, t } }));
      if (done) setPlaying(false);
      else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const startRL = () => {
    if (reduced) {
      setInd({ t: 5 * ind.tau });
      return;
    }
    setInd({ t: 0 });
    setPlaying(true);
  };

  const animate = !reduced;
  const hv = tr.Vp > ELV_AC || tr.Vs > ELV_AC;

  // ----- inductor plot -----
  const plot = useMemo(() => {
    const end = 5 * ind.tau;
    const pts: [number, number][] = [];
    for (let k = 0; k <= 120; k++) {
      const t = (k / 120) * end;
      pts.push([t, rlCurrent(ind.V, ind.R, ind.tau, t)]);
    }
    return { end, pts };
  }, [ind.V, ind.R, ind.tau]);
  const iFinal = ind.V / ind.R;
  const vL = rlInductorVoltage(ind.V, ind.tau, ind.t);
  const short = isShortCoil(ind.d, ind.l);
  const sat = ind.core !== "air" && ind.B > SATURATION_B[ind.core];

  const tabControl = (
    <Segmented
      label="ส่วนการทดลอง"
      value={inp.tab}
      onChange={(v) => {
        setPlaying(false);
        setTab(v);
      }}
      options={[
        { value: "inductor", label: "ตัวเหนี่ยวนำ" },
        { value: "transformer", label: "หม้อแปลง" },
      ]}
    />
  );

  if (inp.tab === "inductor") {
    const controls = (
      <>
        {tabControl}
        <ControlGroup title="ขดลวดโซลินอยด์">
          <Slider label="จำนวนรอบ N" value={ind.N} min={LIMITS.N[0]} max={LIMITS.N[1]} step={1} onChange={(v) => setInd({ N: Math.round(v) })} format={(v) => `${Math.round(v)} รอบ`} />
          <Slider label="ความยาวขดลวด l" value={ind.l * 100} min={LIMITS.lCm[0]} max={LIMITS.lCm[1]} step={0.5} onChange={(v) => setInd({ l: v / 100 })} format={(v) => `${formatSI(v, "", 3)} cm`} />
          <Slider label="เส้นผ่านศูนย์กลางขด d" value={ind.d * 100} min={LIMITS.dCm[0]} max={LIMITS.dCm[1]} step={0.1} onChange={(v) => setInd({ d: v / 100 })} format={(v) => `${formatSI(v, "", 3)} cm`} />
          <LabSelect<CoreKind>
            label="วัสดุแกน"
            value={ind.core}
            onChange={(core) => setInd({ core })}
            options={(Object.keys(CORES) as CoreKind[]).map((k) => ({ value: k, label: CORES[k].label }))}
          />
          <Slider label="กระแสตรง I (สำหรับสนามแม่เหล็ก)" value={ind.I} min={LIMITS.I[0]} max={LIMITS.I[1]} step={0.01} unit="A" onChange={(I) => setInd({ I })} />
        </ControlGroup>
        <ControlGroup title="รีแอกแตนซ์ (ไฟสลับ)">
          <Slider label="ความถี่ f" value={ind.f} min={LIMITS.f[0]} max={LIMITS.f[1]} log unit="Hz" onChange={(f) => setInd({ f })} />
        </ControlGroup>
        <ControlGroup title="วงจร RL เมื่อสับสวิตช์">
          <Slider label="ความต้านทานอนุกรม R" value={ind.R} min={LIMITS.R[0]} max={LIMITS.R[1]} log unit="Ω" onChange={(R) => setInd({ R })} />
          <Slider label="แรงดันแหล่งจ่าย V" value={ind.V} min={LIMITS.V[0]} max={LIMITS.V[1]} step={0.5} unit="V" onChange={(V) => setInd({ V })} />
          <Slider
            label="เวลาหลังสับสวิตช์ t"
            value={Math.min(ind.t, 5 * ind.tau)}
            min={0}
            max={5 * ind.tau}
            step={(5 * ind.tau) / 500}
            unit="s"
            onChange={(t) => {
              setPlaying(false);
              setInd({ t });
            }}
            hint={`t = ${formatSI(ind.t / ind.tau, "", 3)} τ`}
          />
          <div className="flex flex-wrap gap-2">
            <LabButton tone="primary" onClick={startRL}>
              สับสวิตช์ (เริ่ม t = 0)
            </LabButton>
            <LabButton onClick={() => setPlaying((p) => !p)} disabled={reduced} pressed={playing}>
              {playing ? "หยุดชั่วคราว" : "เล่นต่อ"}
            </LabButton>
            <LabButton
              onClick={() => {
                setPlaying(false);
                setInd({ t: 0 });
              }}
            >
              รีเซ็ต
            </LabButton>
          </div>
        </ControlGroup>
      </>
    );
    const readouts = (
      <>
        <Readout label="ความเหนี่ยวนำ L" value={ind.L} unit="H" />
        <Readout label="ความหนาแน่นฟลักซ์ B" value={ind.B} unit="T" tone={sat ? "danger" : "neutral"} />
        <Readout label={`รีแอกแตนซ์ X_L ที่ ${formatSI(ind.f, "Hz")}`} value={ind.XL} unit="Ω" />
        <Readout label="ค่าคงที่เวลา τ = L/R" value={ind.tau} unit="s" />
        <Readout label="กระแส i(t)" value={ind.i} unit="A" />
        <Readout label="แรงดันคร่อม L (ต้านกลับ)" value={vL} unit="V" />
        <Readout label="พื้นที่หน้าตัด A" value={ind.A} unit="m²" />
        <Readout label="i(t) ÷ (V/R)" text={`${formatSI((ind.i / iFinal) * 100, "", 3)} %`} />
      </>
    );
    const footer = (
      <div className="space-y-3">
        <div className="rounded-md border border-line bg-panel p-3">
          <Plot
            title="กราฟกระแสในวงจร RL หลังสับสวิตช์"
            series={[{ name: "i(t)", points: plot.pts }]}
            xLabel="เวลา t"
            xUnit="s"
            yLabel="กระแส i"
            yUnit="A"
            xDomain={[0, plot.end]}
            yDomain={[0, iFinal * 1.1]}
            height={compact ? 200 : 260}
            vLines={[1, 2, 3, 4, 5].map((k) => ({ x: k * ind.tau, label: `${k}τ` }))}
            hLines={[
              { y: iFinal, label: `V/R = ${formatSI(iFinal, "A")}`, color: "var(--fig-ok)" },
              { y: iFinal * 0.632, label: "63.2 %", color: "var(--fig-accent-2)" },
            ]}
            cursorX={Math.min(ind.t, plot.end)}
          />
          <p className="mt-2 text-[0.9rem] text-ink-2">
            ที่ t = {formatSI(ind.t, "s")}: i = {formatSI(ind.i, "A")}, v<sub>L</sub> = {formatSI(vL, "V")} — i(t) = V/R·(1 − e<sup>−t/τ</sup>)
          </p>
        </div>
        <SimNotice tone="info">
          แรงเคลื่อนไฟฟ้าต้านกลับ (back-EMF): ขณะสับสวิตช์ ขดลวดสร้างแรงดัน v<sub>L</sub> = L·di/dt ต้านการเปลี่ยนแปลงกระแส กระแสจึงค่อย ๆ
          เพิ่มขึ้นถึง 63.2 % ที่ 1τ และเกือบเต็มที่ (99.3 %) ที่ 5τ — เมื่อตัดวงจรทันที di/dt สูงมากจะเกิดแรงดันเหนี่ยวนำสูง (ในงานจริงจึงต่อไดโอดกันกลับคร่อมขดลวด)
        </SimNotice>
        {short ? (
          <SimNotice>
            ขดลวดสั้น (l &lt; 10·d): สูตร L และ B ของโซลินอยด์ยาวเป็นค่าประมาณ ค่าจริงต่ำกว่า — ประมาณ ×{formatSI(shortCoilFactor(ind.d, ind.l), "", 2)} (≈{" "}
            {formatSI(ind.L * shortCoilFactor(ind.d, ind.l), "H")})
          </SimNotice>
        ) : null}
        {sat ? (
          <SimNotice tone="danger">
            B ≈ {formatSI(ind.B, "T")} เกินระดับอิ่มตัวโดยประมาณของแกน{ind.core === "iron" ? "เหล็ก (~1.6 T)" : "เฟอร์ไรต์ (~0.4 T)"} — ในความจริง B
            จะไม่เพิ่มตามกระแสอีก แบบจำลองนี้ไม่คิดการอิ่มตัว
          </SimNotice>
        ) : null}
        <AssumptionsPanel items={ASSUMPTIONS} />
      </div>
    );
    return (
      <>
        <style>{STAGE_CSS}</style>
        <LabShell
          compact={compact}
          stageLabel={`ขดลวดโซลินอยด์ ${ind.N} รอบ ยาว ${formatSI(ind.l * 100, "", 3)} ซม. แกน${CORES[ind.core].label} L = ${formatSI(ind.L, "H")} B = ${formatSI(ind.B, "T")}`}
          stage={<InductorStage s={ind} animate={animate} />}
          controls={controls}
          readouts={readouts}
          footer={footer}
        />
      </>
    );
  }

  // ----- transformer tab -----
  const open = !Number.isFinite(tr.Rload);
  const ideal = tr.eta >= 1;
  const controls = (
    <>
      {tabControl}
      <ControlGroup title="ขดลวด">
        <Slider label="จำนวนรอบขดปฐมภูมิ Np" value={tr.Np} min={LIMITS.turns[0]} max={LIMITS.turns[1]} log onChange={(v) => setTr({ Np: Math.round(v) })} format={(v) => `${Math.round(v)} รอบ`} />
        <Slider label="จำนวนรอบขดทุติยภูมิ Ns" value={tr.Ns} min={LIMITS.turns[0]} max={LIMITS.turns[1]} log onChange={(v) => setTr({ Ns: Math.round(v) })} format={(v) => `${Math.round(v)} รอบ`} />
      </ControlGroup>
      <ControlGroup title="แหล่งจ่ายและโหลด">
        <Slider
          label="แรงดันปฐมภูมิ Vp (rms)"
          value={tr.Vp}
          min={LIMITS.Vp[0]}
          max={LIMITS.Vp[1]}
          step={1}
          unit="V"
          onChange={(Vp) => setTr({ Vp })}
          hint={tr.Vp > ELV_AC ? "แบบจำลองเท่านั้น" : undefined}
        />
        {hv ? (
          <SimNotice tone="danger">
            แรงดันเกิน 50 V (เช่น ไฟบ้าน 230 V) เป็นอันตรายถึงชีวิต — งานกับไฟฟ้ากำลังจริงทำได้เฉพาะการสาธิตโดยครูเท่านั้น (S3) ห้องทดลองนี้เป็นแบบจำลองเท่านั้น
          </SimNotice>
        ) : null}
        <Toggle label="เปิดวงจรด้านทุติยภูมิ (ไม่มีโหลด)" checked={open} onChange={(v) => setTr({ Rload: v ? Infinity : 12 })} />
        {!open ? (
          <Slider label="ความต้านทานโหลด R" value={tr.Rload} min={LIMITS.Rload[0]} max={LIMITS.Rload[1]} log unit="Ω" onChange={(Rload) => setTr({ Rload })} />
        ) : null}
        <Toggle
          label="หม้อแปลงอุดมคติ (η = 100 %)"
          description="ปิดเพื่อกำหนดประสิทธิภาพ 80–99 %"
          checked={ideal}
          onChange={(v) => setTr({ eta: v ? 1 : 0.95 })}
        />
        {!ideal ? (
          <Slider
            label="ประสิทธิภาพ η"
            value={tr.eta * 100}
            min={LIMITS.eta[0] * 100}
            max={LIMITS.eta[1] * 100}
            step={1}
            onChange={(v) => setTr({ eta: Math.round(v) / 100 })}
            format={(v) => `${Math.round(v)} %`}
          />
        ) : null}
      </ControlGroup>
      <ControlGroup title="ขั้วหม้อแปลง (dot convention)">
        <Segmented<Polarity>
          label="การจัดขั้ว"
          value={tr.polarity}
          onChange={(polarity) => setTr({ polarity })}
          size="sm"
          options={[
            { value: "subtractive", label: "แบบลบ (subtractive)" },
            { value: "additive", label: "แบบบวก (additive)" },
          ]}
        />
      </ControlGroup>
    </>
  );
  const typeText = tr.type === "step-up" ? "แรงดันขึ้น (step-up)" : tr.type === "step-down" ? "แรงดันลง (step-down)" : "แยกวงจร 1:1 (isolation)";
  const readouts = (
    <>
      <Readout label="แรงดันทุติยภูมิ Vs" value={tr.Vs} unit="V" />
      <Readout label="กระแสทุติยภูมิ Is" value={tr.Is} unit="A" />
      <Readout label="กระแสปฐมภูมิ Ip" value={tr.Ip} unit="A" />
      <Readout label="อัตราส่วนรอบ Np/Ns" text={formatSI(tr.ratio, "", 4)} />
      <Readout label="ชนิด" text={typeText} />
      <Readout label="กำลังด้านทุติยภูมิ Ps" value={tr.Ps} unit="W" />
      <Readout label="กำลังด้านปฐมภูมิ Pp" value={tr.Pp} unit="W" />
      <Readout label="กำลังปรากฏ Vp·Ip" value={tr.Sp} unit="VA" />
    </>
  );
  const footer = (
    <div className="space-y-3">
      <div className="rounded-md border border-line bg-panel p-3">
        <h3 className="mb-2 font-semibold text-ink">ทดสอบขั้ว: ต่อ H1 กับขั้วทุติยภูมิที่อยู่ติดกัน แล้ววัดแรงดันขั้วที่เหลือ</h3>
        <PolarityDiagram s={tr} />
        <p className="mt-2 text-[0.9rem] text-ink-2">
          จุด (•) แสดงปลายขดที่มีเฟสเดียวกัน — กระแสไหลเข้าปลายจุดของขดหนึ่ง จะเหนี่ยวนำให้ปลายจุดของอีกขดเป็นบวกพร้อมกัน{" "}
          {tr.polarity === "additive" ? "แบบบวก: แรงดันทั้งสองรวมกัน" : "แบบลบ: แรงดันหักล้างกัน"} → วัดได้ {formatSI(tr.Vtest, "V")}
        </p>
      </div>
      <p className="text-[0.92rem] text-ink-2">
        Vs = Vp·Ns/Np = {formatSI(tr.Vs, "V")} · Is = Vs/R = {formatSI(tr.Is, "A")} · Ip = Vs·Is/(η·Vp) = {formatSI(tr.Ip, "A")}
        {!ideal ? ` · กำลังสูญเสีย ${formatSI(tr.Ploss, "W")}` : ""}
      </p>
      <AssumptionsPanel items={ASSUMPTIONS} />
    </div>
  );
  return (
    <>
      <style>{STAGE_CSS}</style>
      <LabShell
        compact={compact}
        stageLabel={`หม้อแปลง${typeText} Np:Ns = ${tr.Np}:${tr.Ns} Vp = ${formatSI(tr.Vp, "V")} Vs = ${formatSI(tr.Vs, "V")}`}
        stage={<TransformerStage s={tr} animate={animate} />}
        controls={controls}
        readouts={readouts}
        footer={footer}
      />
    </>
  );
}
