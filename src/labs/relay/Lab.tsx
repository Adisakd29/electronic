"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LabProps } from "../types";
import { AssumptionsPanel, ControlGroup, LabSelect, LabShell, Plot, Readout, Segmented, SimNotice, Slider, Toggle } from "../shared/ui";
import { formatSI } from "../shared/format";
import { presetInputs, solve, SPIKE_WARN_V, type RelayInputs, type RelayMode, type RelayState } from "./model";
import { RelayStage } from "./Stage";
import { ASSUMPTIONS } from "./assumptions";

interface Board {
  preset: string | undefined;
  inp: RelayInputs;
  s: RelayState;
}

const init = (preset: string | undefined): Board => {
  const inp = presetInputs(preset);
  return { preset, inp, s: solve(inp) };
};

/** Momentary push button: held while pointer is down or Space/Enter is held. */
function Momentary({ label, pressed, onChange, tone, hint }: { label: string; pressed: boolean; onChange: (v: boolean) => void; tone: "ok" | "danger" | "neutral"; hint: string }) {
  const tones = {
    ok: "bg-ok text-white",
    danger: "bg-danger text-white",
    neutral: "bg-panel text-ink border border-line-strong",
  };
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

export default function RelayLab({ preset, onState, compact = false }: LabProps) {
  const [b, setB] = useState<Board>(() => init(preset));
  if (b.preset !== preset) setB(init(preset));
  const { inp, s } = b;

  const set = (patch: Partial<RelayInputs>) =>
    setB((cur) => {
      const next = { ...cur.inp, ...patch };
      return { ...cur, inp: next, s: solve(next, cur.s) };
    });

  const cb = useRef(onState);
  useEffect(() => {
    cb.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => cb.current?.(s), 150);
    return () => clearTimeout(t);
  }, [s]);

  const d = s.driver;
  const spikeBad = s.lastSpikeV > SPIKE_WARN_V;
  const stageLabel =
    `แผนภาพวงจรรีเลย์ โหมด${modeName(s.mode)}: แรงดันคอยล์ ${formatSI(s.coilV, "V")} กระแสคอยล์ ${formatSI(s.coilI, "A")} ` +
    `รีเลย์${s.energized ? "ทำงาน หน้าสัมผัส COM ต่อกับ NO" : "ไม่ทำงาน หน้าสัมผัส COM ต่อกับ NC"} ` +
    `หลอด NO ${s.lampNO ? "ติด" : "ดับ"} หลอด NC ${s.lampNC ? "ติด" : "ดับ"}`;

  const controls = (
    <>
      <LabSelect<RelayMode>
        label="โหมดการทดลอง"
        value={inp.mode}
        onChange={(m) => set({ ...presetInputs(m === "basic" ? "default" : m), supplyV: inp.supplyV, coilR: inp.coilR, flyback: inp.flyback })}
        options={[
          { value: "basic", label: "พื้นฐาน: สวิตช์ควบคุมคอยล์" },
          { value: "driver", label: "ขับด้วยทรานซิสเตอร์ NPN" },
          { value: "latch", label: "วงจรล็อกตัวเอง START–STOP" },
        ]}
      />

      <ControlGroup title="ด้านขดลวด (คอยล์ 12 V)">
        <Slider label="แรงดันแหล่งจ่าย V_S" value={inp.supplyV} onChange={(v) => set({ supplyV: v })} min={0} max={15} step={0.1} unit="V" hint={`ดึงเข้า ≥ ${formatSI(s.pickUpV, "V")} · ปล่อย ≤ ${formatSI(s.dropOutV, "V")}`} />
        <Slider label="ความต้านทานคอยล์ R_coil" value={inp.coilR} onChange={(v) => set({ coilR: v })} min={100} max={1000} step={10} unit="Ω" />
        <Toggle label="ไดโอดป้องกัน (flyback) D1" description="ต่อขนานคอยล์ กลับขั้ว (แคโทดที่ A1)" checked={inp.flyback} onChange={(v) => set({ flyback: v })} />
      </ControlGroup>

      {inp.mode === "basic" ? (
        <ControlGroup title="อินพุต">
          <Segmented<"toggle" | "push">
            label="ชนิดสวิตช์ S1"
            size="sm"
            value={inp.switchKind}
            onChange={(k) => set({ switchKind: k, switchOn: false })}
            options={[
              { value: "toggle", label: "สวิตช์โยก" },
              { value: "push", label: "ปุ่มกดชั่วขณะ" },
            ]}
          />
          {inp.switchKind === "toggle" ? (
            <Toggle label="สวิตช์ S1" description={inp.switchOn ? "ต่อวงจร" : "เปิดวงจร"} checked={inp.switchOn} onChange={(v) => set({ switchOn: v })} />
          ) : (
            <Momentary label="S1" tone="neutral" pressed={inp.switchOn} onChange={(v) => set({ switchOn: v })} hint="ปุ่มกดชั่วขณะ กดค้างเพื่อจ่ายไฟให้คอยล์" />
          )}
        </ControlGroup>
      ) : null}

      {inp.mode === "driver" ? (
        <ControlGroup title="วงจรขับ NPN (β = 100)">
          <Toggle label="อินพุตลอจิก Vin" description={inp.switchOn ? `HIGH = ${formatSI(inp.vinHigh, "V")}` : "LOW = 0 V"} checked={inp.switchOn} onChange={(v) => set({ switchOn: v })} />
          <Segmented<"5" | "3.3">
            label="ระดับ HIGH ของ Vin"
            size="sm"
            value={inp.vinHigh === 5 ? "5" : "3.3"}
            onChange={(v) => set({ vinHigh: Number(v) })}
            options={[
              { value: "5", label: "5 V" },
              { value: "3.3", label: "3.3 V" },
            ]}
          />
          <Slider label="ตัวต้านทานเบส R_B" value={inp.rb} onChange={(v) => set({ rb: v })} min={220} max={100000} log unit="Ω" />
        </ControlGroup>
      ) : null}

      {inp.mode === "latch" ? (
        <ControlGroup title="ปุ่มควบคุม">
          <div className="flex flex-wrap gap-2">
            <Momentary label="START (NO)" tone="ok" pressed={inp.startPressed} onChange={(v) => set({ startPressed: v })} hint="ปุ่มกดสตาร์ต หน้าสัมผัสปกติเปิด" />
            <Momentary label="STOP (NC)" tone="danger" pressed={inp.stopPressed} onChange={(v) => set({ stopPressed: v })} hint="ปุ่มกดหยุด หน้าสัมผัสปกติปิด" />
          </div>
          <p className="text-[0.85rem] text-ink-3">กดค้างด้วยเมาส์/นิ้ว หรือโฟกัสปุ่มแล้วกด Space ค้าง ปล่อยแล้วสังเกตว่ารีเลย์ยังค้างอยู่หรือไม่</p>
          <Toggle label="จำลองโอเวอร์โหลดทริป" description="หน้าสัมผัส OL 95–96 (NC) เปิด" checked={inp.olTripped} onChange={(v) => set({ olTripped: v })} />
        </ControlGroup>
      ) : null}
    </>
  );

  const readouts: ReactNode[] = [
    <Readout key="v" label="แรงดันคร่อมคอยล์" value={s.coilV} unit="V" />,
    <Readout key="i" label="กระแสคอยล์ I = V/R" value={s.coilI} unit="A" />,
    <Readout key="st" label="สถานะรีเลย์" text={s.energized ? "ทำงาน (ดูด)" : "ไม่ทำงาน"} tone={s.energized ? "ok" : "neutral"} />,
    <Readout key="no" label="หลอด NO (เขียว) 11–14" text={s.lampNO ? "ติด" : "ดับ"} tone={s.lampNO ? "ok" : "neutral"} />,
    <Readout key="nc" label="หลอด NC (แดง) 11–12" text={s.lampNC ? "ติด" : "ดับ"} tone={s.lampNC ? "danger" : "neutral"} />,
    <Readout
      key="sp"
      label="แรงดันกระชากล่าสุดขณะตัด"
      text={s.lastSpikeV > 0 ? (spikeBad ? `> 100 V (≈ ${formatSI(s.lastSpikeV, "V")})` : `≈ ${formatSI(s.lastSpikeV, "V")}`) : "—"}
      tone={s.lastSpikeV > 0 ? (spikeBad ? "danger" : "ok") : "neutral"}
    />,
  ];
  if (!compact) readouts.splice(2, 0, <Readout key="p" label="กำลังคอยล์" value={s.coilP} unit="W" />);
  if (d) {
    readouts.push(
      <Readout key="ib" label="กระแสเบส I_B" value={d.Ib} unit="A" />,
      <Readout key="icm" label="β·I_B (Ic สูงสุดที่ได้)" value={d.IcMax} unit="A" />,
      <Readout key="icn" label="Ic ที่ต้องการ (อิ่มตัว)" value={d.IcNeeded} unit="A" />,
      <Readout key="sat" label="ทรานซิสเตอร์" text={d.Ib === 0 ? "คัตออฟ" : d.saturated ? "อิ่มตัว" : "แอกทีฟ (ไม่อิ่มตัว)"} tone={d.Ib === 0 ? "neutral" : d.saturated ? "ok" : "warn"} />,
      <Readout key="vce" label="V_CE" value={d.Vce} unit="V" />,
    );
  }
  if (s.mode === "latch") {
    readouts.push(<Readout key="lt" label="ล็อกตัวเอง (21–24)" text={s.latched ? "ค้างอยู่" : s.energized ? "ทำงาน (กด START อยู่)" : "ไม่ล็อก"} tone={s.latched ? "ok" : "neutral"} />);
  }

  const notices = (
    <div className="space-y-2">
      {s.lastSpikeV > 0 && spikeBad ? (
        <SimNotice tone="danger">
          ไม่มีไดโอดป้องกัน: เมื่อตัดกระแสคอยล์ ขดลวดสร้างแรงดันเหนี่ยวนำย้อนกลับสูงมาก (ค่าในแบบจำลองเป็นค่าประกอบการอธิบาย ≈ {formatSI(s.lastSpikeV, "V")})
          อาจทำให้หน้าสัมผัสสวิตช์อาร์กหรือทรานซิสเตอร์เสียหาย — เปิด D1 แล้วลองใหม่
        </SimNotice>
      ) : null}
      {s.lastSpikeV > 0 && !spikeBad ? (
        <SimNotice tone="info">ไดโอด D1 นำกระแสคอยล์ให้ไหลวนต่อ แรงดันที่จุดสวิตช์ถูกจำกัดที่ ≈ V_S + 0.7 V = {formatSI(s.lastSpikeV, "V")} (แลกกับการปล่อยหน้าสัมผัสช้าลงเล็กน้อย)</SimNotice>
      ) : null}
      {d && d.Ib > 0 && !d.saturated ? (
        <SimNotice tone="warn">
          ทรานซิสเตอร์ไม่อิ่มตัว: β·I_B = {formatSI(d.IcMax, "A")} น้อยกว่าที่คอยล์ต้องการ {formatSI(d.IcNeeded, "A")} — ลดค่า R_B
          {s.energized ? "" : " (แรงดันคอยล์ต่ำกว่าแรงดันดึงเข้า รีเลย์จึงไม่ทำงาน)"}
        </SimNotice>
      ) : null}
      {inp.supplyV > 13.2 ? <SimNotice tone="warn">แรงดันเกินพิกัดคอยล์ 12 V มากกว่า 10 % — คอยล์จริงจะร้อนขึ้น (กำลัง ∝ V²)</SimNotice> : null}
    </div>
  );

  const loop = s.mode === "basic" && !compact;
  const footer = (
    <div className="space-y-3">
      {notices}
      {loop ? (
        <div className="rounded-md border border-line bg-panel p-2">
          <Plot
            title="กราฟฮิสเทรีซิสของรีเลย์: สถานะหน้าสัมผัส NO เทียบแรงดันคอยล์"
            xLabel="แรงดันคอยล์"
            xUnit="V"
            yLabel="NO ต่อ (1)"
            xDomain={[0, 15]}
            yDomain={[-0.2, 1.3]}
            height={220}
            vLines={[
              { x: s.pickUpV, label: "ดึงเข้า 9 V", color: "var(--fig-ok)" },
              { x: s.dropOutV, label: "ปล่อย 1.2 V", color: "var(--fig-danger)" },
            ]}
            series={[
              { name: "เพิ่มแรงดัน", points: [[0, 0], [s.pickUpV, 0], [s.pickUpV, 1], [15, 1]], color: "var(--fig-accent)" },
              { name: "ลดแรงดัน", points: [[15, 1], [s.dropOutV, 1], [s.dropOutV, 0], [0, 0]], color: "var(--fig-accent-2)", dashed: true },
              { name: "จุดทำงานตอนนี้", points: [[s.coilV, s.energized ? 1 : 0]], color: "var(--fig-current)", markers: true },
            ]}
          />
        </div>
      ) : null}
      <p className="text-[0.85rem] text-ink-3">วงจรโหลดในแล็บนี้ใช้ไฟ 12 V DC เท่านั้น งานจริงกับไฟบ้าน 230 V ต้องเป็นการสาธิตของครูเท่านั้น</p>
      <AssumptionsPanel items={ASSUMPTIONS} />
    </div>
  );

  return <LabShell compact={compact} stageLabel={stageLabel} stage={<RelayStage s={s} inp={inp} />} controls={controls} readouts={readouts} footer={footer} />;
}

function modeName(m: RelayMode): string {
  return m === "basic" ? "พื้นฐาน" : m === "driver" ? "ขับด้วยทรานซิสเตอร์" : "ล็อกตัวเอง";
}
