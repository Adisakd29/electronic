"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LabProps } from "../types";
import { AssumptionsPanel, ControlGroup, LabButton, LabShell, Plot, Readout, Segmented, SimNotice, Slider, Toggle } from "../shared/ui";
import { formatSI } from "../shared/format";
import {
  LOAD_MAX,
  OVERHEAT_I,
  V_MAX,
  bridgeModeText,
  dutyCurves,
  presetInputs,
  pwmWave,
  resetFuse,
  settle,
  signedOmega,
  simulateOverload,
  solve,
  speedTorqueCurve,
  startVoltage,
  statusText,
  stepOmega,
  toRpm,
  type Motion,
  type MotorInputs,
  type MotorState,
  type MotorTab,
  type Switches,
} from "./model";
import { MotorStage } from "./Stage";
import { ASSUMPTIONS } from "./assumptions";

interface Board {
  preset: string | undefined;
  inp: MotorInputs;
  s: MotorState;
}

const init = (preset: string | undefined): Board => {
  const inp = presetInputs(preset);
  return { preset, inp, s: solve(inp) };
};

/** No-load full speed (575 rad/s) is drawn as 1.5 rev/s. */
const VISUAL_DEG_PER_RAD = 540 / 575;

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

/** Animated rotor: displayed speed follows the steady state (first-order). */
function useRotor(target: number, motion: Motion, load: number, enabled: boolean) {
  const [view, setView] = useState({ angle: 0, w: 0 });
  const ref = useRef({ angle: 0, w: 0, target, motion, load });
  useEffect(() => {
    ref.current.target = target;
    ref.current.motion = motion;
    ref.current.load = load;
  }, [target, motion, load]);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const st = ref.current;
      let w = stepOmega(st.w, st.target, st.motion, dt, st.load);
      if (Math.abs(w - st.target) < 0.05 && st.motion === "drive") w = st.target;
      const changed = w !== st.w || w !== 0;
      st.w = w;
      st.angle = (st.angle + w * VISUAL_DEG_PER_RAD * dt) % 360;
      if (changed) setView({ angle: st.angle, w });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return enabled ? view : { angle: 0, w: target };
}

/** Momentary push button: held while pointer is down or Space/Enter is held. */
function Momentary({ label, pressed, onChange, tone, hint }: { label: string; pressed: boolean; onChange: (v: boolean) => void; tone: "ok" | "danger"; hint: string }) {
  const tones = { ok: "bg-ok text-white", danger: "bg-danger text-white" };
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={hint}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onChange(true);
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          onChange(true);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(false);
        }
      }}
      onBlur={() => pressed && onChange(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`h-12 min-w-[6.5rem] touch-none select-none rounded-sm px-3 font-semibold transition-transform ${tones[tone]} ${pressed ? "translate-y-px ring-2 ring-cobalt ring-offset-2" : "shadow-1"}`}
    >
      {label}
      <span className="block text-[0.75rem] font-normal opacity-90">{pressed ? "กำลังกด" : "กดค้างไว้"}</span>
    </button>
  );
}

const SW_INFO = ["S1 (บนซ้าย)", "S2 (ล่างซ้าย)", "S3 (บนขวา)", "S4 (ล่างขวา)"];

export default function MotorLab({ preset, onState, compact = false }: LabProps) {
  const [b, setB] = useState<Board>(() => init(preset));
  if (b.preset !== preset) setB(init(preset));
  const { inp, s } = b;

  const update = (fn: (cur: MotorInputs, s: MotorState) => MotorInputs) =>
    setB((cur) => {
      const next = settle(fn(cur.inp, cur.s));
      return { ...cur, inp: next, s: solve(next, cur.s) };
    });
  const set = (patch: Partial<MotorInputs>) => update((cur) => ({ ...cur, ...patch }));

  const cb = useRef(onState);
  useEffect(() => {
    cb.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => cb.current?.(s), 150);
    return () => clearTimeout(t);
  }, [s]);

  const reduced = usePrefersReducedMotion();
  const rotor = useRotor(signedOmega(s), s.motion, s.load, !reduced);

  const status = statusText(s);
  const stageLabel =
    `แผนภาพ${tabName(s.tab)}: มอเตอร์${status} ความเร็ว ${Math.round(s.rpm)} rpm กระแส ${formatSI(s.current, "A")} ` +
    `แรงดันเฉลี่ยที่มอเตอร์ ${formatSI(s.vEff, "V")}` +
    (s.tab === "hbridge" ? ` สวิตช์ ${s.switches.map((on, i) => `S${i + 1} ${on ? "ต่อ" : "ตัด"}`).join(" ")}${s.fuseBlown ? " ฟิวส์ขาด" : ""}` : "") +
    (s.tab === "contactor" ? ` คอยล์ K1 ${s.contactor.coil ? "มีไฟ" : "ไม่มีไฟ"} โอเวอร์โหลด${s.contactor.overloadTripped ? "ทริป" : "ปกติ"}` : "");

  const motorControls = (showDuty: boolean, showFreq: boolean) => (
    <ControlGroup title="มอเตอร์ PMDC 12 V">
      <Slider label={s.tab === "contactor" ? "แรงดันวงจรกำลัง V" : "แรงดันแหล่งจ่าย V"} value={inp.V} onChange={(v) => set({ V: v })} min={0} max={V_MAX} step={0.1} unit="V" />
      {showDuty ? (
        <Slider
          label="duty cycle D"
          value={inp.duty}
          onChange={(v) => set({ duty: v })}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)} %`}
          hint={`V_eff = D × V = ${formatSI(s.vEff, "V", 3)}`}
        />
      ) : null}
      {showFreq ? (
        <Slider label="ความถี่ PWM (แสดงเท่านั้น)" value={inp.pwmFreq} onChange={(v) => set({ pwmFreq: v })} min={100} max={20000} log unit="Hz" />
      ) : null}
      <Slider
        label="แรงบิดภาระ T_L"
        value={inp.load}
        onChange={(v) => set({ load: v })}
        min={0}
        max={LOAD_MAX}
        step={0.001}
        format={(v) => `${Number(v.toFixed(3))} N·m`}
        hint={`เริ่มหมุนได้เมื่อ V_eff > ${formatSI(startVoltage(inp.load), "V", 3)}`}
      />
      <Toggle label="ล็อกเพลา (จำลองติดขัด)" description={inp.locked ? "เพลาหมุนไม่ได้" : "เพลาหมุนได้อิสระ"} checked={inp.locked} onChange={(v) => set({ locked: v })} />
    </ControlGroup>
  );

  const controls = (
    <>
      <Segmented<MotorTab>
        label="แท็บการทดลอง"
        value={inp.tab}
        onChange={(t) => set({ tab: t, startPressed: false, stopPressed: false })}
        options={[
          { value: "pwm", label: "PWM" },
          { value: "hbridge", label: "H-bridge" },
          { value: "contactor", label: "คอนแทกเตอร์" },
        ]}
      />

      {inp.tab === "pwm" ? motorControls(true, true) : null}

      {inp.tab === "hbridge" ? (
        <>
          <ControlGroup title="สวิตช์ H-bridge">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {SW_INFO.map((name, i) => (
                <Toggle
                  key={name}
                  label={name}
                  description={inp.switches[i] ? "ON ต่อ" : "OFF ตัด"}
                  checked={inp.switches[i]}
                  onChange={(v) =>
                    update((cur) => {
                      const sw = [...cur.switches] as Switches;
                      sw[i] = v;
                      return { ...cur, switches: sw };
                    })
                  }
                />
              ))}
            </div>
            <p className="text-[0.85rem] text-ink-3" aria-live="polite">
              สถานะ: {s.fuseBlown && s.bridgeMode !== "shoot-through" ? "ฟิวส์ขาด – มอเตอร์ไม่มีไฟ" : bridgeModeText(s.bridgeMode)}
            </p>
            <div className="flex flex-wrap gap-2">
              <LabButton tone="danger" disabled={!s.fuseBlown} onClick={() => update((cur) => resetFuse(cur))}>
                รีเซ็ต (เปลี่ยนฟิวส์)
              </LabButton>
              <LabButton onClick={() => set({ switches: [false, false, false, false] })}>ปิดสวิตช์ทั้งหมด</LabButton>
            </div>
          </ControlGroup>
          {motorControls(true, false)}
        </>
      ) : null}

      {inp.tab === "contactor" ? (
        <>
          <ControlGroup title="ปุ่มควบคุม (วงจร 24 V)">
            <div className="flex flex-wrap gap-2">
              <Momentary label="START (NO)" tone="ok" pressed={inp.startPressed} onChange={(v) => set({ startPressed: v })} hint="ปุ่มสตาร์ต หน้าสัมผัสปกติเปิด" />
              <Momentary label="STOP (NC)" tone="danger" pressed={inp.stopPressed} onChange={(v) => set({ stopPressed: v })} hint="ปุ่มหยุด หน้าสัมผัสปกติปิด" />
            </div>
            <p className="text-[0.85rem] text-ink-3">กดค้างด้วยเมาส์/นิ้ว หรือโฟกัสปุ่มแล้วกด Space ค้าง ปล่อยแล้วสังเกตว่ามอเตอร์ยังทำงานหรือไม่</p>
            <div className="flex flex-wrap gap-2">
              <LabButton tone="danger" disabled={!s.contactor.running} onClick={() => update((cur, st) => simulateOverload(cur, st))}>
                จำลองโหลดเกิน
              </LabButton>
              <LabButton disabled={!inp.olTripped} onClick={() => set({ olTripped: false })}>
                รีเซ็ต OL
              </LabButton>
            </div>
            {!s.contactor.running && !inp.olTripped ? <p className="text-[0.85rem] text-ink-3">“จำลองโหลดเกิน” ใช้ได้เมื่อมอเตอร์ทำงานอยู่ (ต้องมีกระแสจึงทริป)</p> : null}
          </ControlGroup>
          {motorControls(false, false)}
        </>
      ) : null}
    </>
  );

  const readouts: ReactNode[] = [
    <Readout key="st" label="สถานะมอเตอร์" text={status} tone={s.shortCircuit || s.overheat ? "danger" : s.stalled ? "warn" : s.direction !== "stop" ? "ok" : "neutral"} />,
    <Readout key="rpm" label="ความเร็วรอบ" text={`${Math.round(s.rpm)} rpm`} />,
    <Readout key="i" label="กระแสมอเตอร์ I" value={s.current} unit="A" tone={s.overheat ? "danger" : "neutral"} />,
    <Readout key="e" label="แรงเคลื่อนต้านกลับ E = kω" value={s.backEmf} unit="V" />,
    <Readout key="ve" label="แรงดันเฉลี่ย V_eff" value={s.vEff} unit="V" />,
  ];
  if (!compact) {
    readouts.push(
      <Readout key="w" label="ความเร็วเชิงมุม ω" text={`${formatSI(s.omega, "", 4)} rad/s`} />,
      <Readout key="pin" label="กำลังไฟฟ้าเข้า P_in" value={s.pIn} unit="W" />,
      <Readout key="pout" label="กำลังกลออก P_out" value={s.pOut} unit="W" />,
      <Readout key="eff" label="ประสิทธิภาพ η" text={`${(s.efficiency * 100).toFixed(1)} %`} />,
    );
  }
  if (s.tab === "contactor") {
    const c = s.contactor;
    readouts.push(
      <Readout key="k1" label="คอยล์ K1" text={c.coil ? "มีไฟ (ดูด)" : "ไม่มีไฟ"} tone={c.coil ? "ok" : "neutral"} />,
      <Readout key="hold" label="หน้าสัมผัสยึดตัวเอง K1 13–14" text={c.holding ? (inp.startPressed ? "ปิด" : "ปิด – ยึดตัวเองอยู่") : "เปิด"} tone={c.holding ? "ok" : "neutral"} />,
      <Readout key="ol" label="โอเวอร์โหลด OL 95–96" text={c.overloadTripped ? "ทริป (เปิดวงจร)" : "ปกติ (ปิด)"} tone={c.overloadTripped ? "danger" : "neutral"} />,
    );
  }

  const wave = pwmWave(s.V, s.duty, s.pwmFreq);
  const tEnd = 3 * wave.T * wave.scale;
  const curves = dutyCurves(s.V, s.load, s.locked);

  const footer = (
    <div className="space-y-3">
      <div className="space-y-2">
        {s.shortCircuit ? (
          <SimNotice tone="danger">
            Shoot-through: สวิตช์บนและล่างของขาเดียวกันต่อพร้อมกัน แหล่งจ่ายถูกลัดวงจรผ่านสวิตช์ กระแสสูงมาก ฟิวส์ F1 ขาด มอเตอร์หยุด — กด “รีเซ็ต (เปลี่ยนฟิวส์)” แล้วห้ามเปิด S1+S2 หรือ S3+S4 พร้อมกัน
          </SimNotice>
        ) : null}
        {s.overheat ? (
          <SimNotice tone="danger">
            มอเตอร์ไม่หมุนแต่กินกระแส {formatSI(s.current, "A")} (เกิน {OVERHEAT_I} A) — ไม่มีแรงเคลื่อนต้านกลับมาจำกัดกระแส I = V_eff/Ra ขดลวดจะร้อนเกินและไหม้ได้ ต้องตัดไฟทันที
          </SimNotice>
        ) : null}
        {s.stalled && !s.overheat ? (
          <SimNotice tone="warn">
            มอเตอร์ไม่หมุน (stall): {s.locked ? "เพลาถูกล็อก" : `V_eff = ${formatSI(s.vEff, "V", 3)} ไม่เกิน ${formatSI(startVoltage(s.load), "V", 3)} ซึ่งเป็นแรงดันที่ต้องใช้เอาชนะแรงเสียดทานและภาระ`} กระแส = V_eff/Ra = {formatSI(s.current, "A")} กลายเป็นความร้อนทั้งหมด
          </SimNotice>
        ) : null}
        {s.braking ? (
          <SimNotice tone="info">เบรก: ขั้วมอเตอร์ทั้งสองต่อถึงกัน แรงเคลื่อนต้านกลับดันกระแสไหลวนสร้างแรงบิดต้าน มอเตอร์หยุดเร็วกว่าการปล่อยหมุนอิสระ (coast)</SimNotice>
        ) : null}
        {s.tab === "hbridge" ? (
          <p className="text-[0.85rem] text-ink-3">ก่อนกลับทิศควรหยุดหรือเบรกก่อน การกลับทิศทันทีในมอเตอร์จริงทำให้กระแสกระชากสูง (แล็บแสดงเฉพาะค่าคงตัว)</p>
        ) : null}
        {s.tab === "contactor" ? (
          <SimNotice tone="warn">
            แล็บนี้จำลองวงจรควบคุมแรงดันต่ำ 24 V เท่านั้น การต่อวงจรกำลังมอเตอร์ 3 เฟส 400 V หรือไฟบ้าน 230 V จริง เป็นงานสาธิตของครูเท่านั้น นักเรียนห้ามต่อเอง
          </SimNotice>
        ) : null}
      </div>

      {s.tab !== "contactor" && !compact ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-line bg-panel p-2">
            <Plot
              title={`รูปคลื่น PWM ${formatSI(s.pwmFreq, "Hz")} duty ${Math.round(s.duty * 100)} % แอมพลิจูด ${formatSI(s.V, "V")} ค่าเฉลี่ย ${formatSI(s.vEff, "V")}`}
              xLabel="เวลา"
              xUnit={wave.unit}
              yLabel="แรงดัน"
              yUnit="V"
              xDomain={[0, tEnd]}
              yDomain={[-0.5, 13]}
              height={220}
              hLines={[{ y: s.duty * s.V, label: `V_eff ${formatSI(s.duty * s.V, "V", 3)}`, color: "var(--fig-current)" }]}
              series={[{ name: "แรงดันที่ขั้วมอเตอร์", points: wave.points, color: "var(--fig-accent)" }]}
            />
          </div>
          <div className="rounded-md border border-line bg-panel p-2">
            <Plot
              title="ความเร็วรอบเทียบแรงบิดภาระที่ V_eff ปัจจุบัน ภาระมากขึ้นความเร็วลดลง"
              xLabel="แรงบิดภาระ T_L"
              xUnit="N·m"
              yLabel="ความเร็ว"
              yUnit="rpm"
              xDomain={[0, LOAD_MAX]}
              yDomain={[0, 6000]}
              height={220}
              series={[
                { name: `เส้นความเร็ว–แรงบิด ที่ V_eff ${formatSI(s.vEff, "V", 3)}`, points: speedTorqueCurve(s.vEff), color: "var(--fig-accent)" },
                { name: "จุดทำงานตอนนี้", points: [[s.load, s.rpm]], color: "var(--fig-current)", markers: true },
              ]}
            />
          </div>
          {s.tab === "pwm" ? (
            <>
              <div className="rounded-md border border-line bg-panel p-2">
                <Plot
                  title={`ความเร็วรอบเทียบ duty ที่แหล่งจ่าย ${formatSI(s.V, "V")} ภาระ ${formatSI(s.load, "N·m")} จุดปัจจุบัน duty ${Math.round(s.duty * 100)} % ${Math.round(s.rpm)} rpm`}
                  xLabel="duty"
                  xUnit="%"
                  yLabel="ความเร็ว"
                  yUnit="rpm"
                  xDomain={[0, 100]}
                  yDomain={[0, 6000]}
                  height={200}
                  vLines={[{ x: Math.min(100, (startVoltage(s.load) / Math.max(s.V, 1e-9)) * 100), label: "เริ่มหมุน", color: "var(--fig-muted)" }]}
                  series={[
                    { name: "rpm เทียบ duty", points: curves.rpm, color: "var(--fig-accent)" },
                    { name: "จุดปัจจุบัน", points: [[s.duty * 100, s.rpm]], color: "var(--fig-current)", markers: true },
                  ]}
                />
              </div>
              <div className="rounded-md border border-line bg-panel p-2">
                <Plot
                  title={`กระแสเทียบ duty: ขณะหมุนกระแสคงที่ตามภาระ ขณะยังไม่หมุน (stall) กระแส = V_eff/Ra จุดปัจจุบัน ${formatSI(s.current, "A")}`}
                  xLabel="duty"
                  xUnit="%"
                  yLabel="กระแส I"
                  yUnit="A"
                  xDomain={[0, 100]}
                  yDomain={[0, Math.max(0.5, Math.ceil(Math.max(...curves.current.map((p) => p[1]), s.current) * 2) / 2)]}
                  height={200}
                  hLines={[{ y: OVERHEAT_I, label: `ร้อนเกิน ${OVERHEAT_I} A`, color: "var(--fig-danger)" }]}
                  series={[
                    { name: "I เทียบ duty", points: curves.current, color: "var(--fig-accent-2)" },
                    { name: "จุดปัจจุบัน", points: [[s.duty * 100, s.current]], color: "var(--fig-current)", markers: true },
                  ]}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      {s.tab === "pwm" ? (
        <p className="text-[0.85rem] text-ink-2">
          อ่านกราฟ: ความเร็วเพิ่มเป็นเส้นตรงตาม duty หลังผ่านจุด “เริ่มหมุน” (V_eff ต้องเกิน {formatSI(startVoltage(s.load), "V", 3)} เพื่อชนะแรงเสียดทานและภาระ) ส่วนกระแสขณะหมุนขึ้นกับแรงบิดเท่านั้น I = (T_L + T_f)/k ไม่ขึ้นกับความเร็ว — กระแสที่ duty ต่ำก่อนเริ่มหมุนคือกระแส stall
        </p>
      ) : null}
      <p className="text-[0.85rem] text-ink-3">
        ภาพโรเตอร์หมุนช้ากว่าจริงเพื่อให้มองเห็นได้ ตัวเลขทั้งหมดเป็นค่าสภาวะคงตัว (ที่ {Math.round(toRpm(575))} rpm ภาพหมุน 1.5 รอบ/วินาที)
      </p>
      <AssumptionsPanel items={ASSUMPTIONS} />
    </div>
  );

  return (
    <LabShell
      compact={compact}
      stageLabel={stageLabel}
      stage={<MotorStage s={s} inp={inp} angle={rotor.angle} wNow={rotor.w} />}
      controls={controls}
      readouts={readouts}
      footer={footer}
    />
  );
}

function tabName(t: MotorTab): string {
  return t === "pwm" ? "วงจร PWM" : t === "hbridge" ? "วงจร H-bridge" : "วงจรสตาร์ต–สตอปด้วยคอนแทกเตอร์";
}
