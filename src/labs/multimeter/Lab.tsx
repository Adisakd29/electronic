"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LabProps } from "../types";
import { AssumptionsPanel, ControlGroup, LabButton, LabSelect, LabShell, Readout, Segmented, SimNotice } from "../shared/ui";
import { formatSI } from "../shared/format";
import { ASSUMPTIONS } from "./assumptions";
import {
  BEEP_OHMS,
  BOARD_POINTS,
  ITEM_IDS,
  ITEMS,
  PRESET_ITEMS,
  presetInputs,
  pressRange,
  RANGES,
  replaceFuse,
  solve,
  unknownResistor,
  update,
  type BoardPoint,
  type Dial,
  type ItemId,
  type Jack,
  type MeterInputs,
  type MultimeterState,
  type Placement,
  type WarnCode,
} from "./model";
import { DIAL_LABEL, MultimeterStage } from "./Stage";

const DIAL_TEXT: Record<Dial, string> = {
  off: "OFF",
  VDC: "V⎓ แรงดันตรง",
  VAC: "V~ แรงดันสลับ",
  mV: "mV⎓",
  ohm: "Ω โอห์ม",
  continuity: "•))) ต่อเนื่อง",
  diode: "▷| ไดโอด",
  mA: "mA กระแส",
  A: "A กระแส",
};

const DANGER: WarnCode[] = ["fuse-mA", "fuse-10A", "fuse-blew-mains", "live-ohm", "cap-charged"];

/** Short continuity beep through Web Audio (best effort; silent if unavailable). */
function beepOnce() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 2700;
    g.gain.value = 0.05;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
    o.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}

interface Board {
  preset: string | undefined;
  inp: MeterInputs;
}

export default function MultimeterLab({ preset, onState, compact = false }: LabProps) {
  const [b, setB] = useState<Board>(() => ({ preset, inp: presetInputs(preset) }));
  if (b.preset !== preset) setB({ preset, inp: presetInputs(preset) });
  const inp = b.inp;
  const s: MultimeterState = solve(inp);
  const [sound, setSound] = useState(true);

  const set = (patch: Partial<MeterInputs>) => setB((cur) => ({ ...cur, inp: update(cur.inp, patch) }));
  const act = (fn: (i: MeterInputs) => MeterInputs) => setB((cur) => ({ ...cur, inp: fn(cur.inp) }));

  const cb = useRef(onState);
  useEffect(() => {
    cb.current = onState;
  }, [onState]);
  useEffect(() => {
    const t = setTimeout(() => cb.current?.(s), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inp]);

  const prevBeep = useRef(false);
  useEffect(() => {
    if (s.beep && !prevBeep.current && sound) beepOnce();
    prevBeep.current = s.beep;
  }, [s.beep, sound]);

  const def = ITEMS[inp.item];
  const first = PRESET_ITEMS[preset ?? "default"] ?? PRESET_ITEMS.default;
  const itemOrder: ItemId[] = [...first, ...ITEM_IDS.filter((i) => !first.includes(i))];
  const isBoard = inp.item === "resistor-board";
  const isSeries = inp.item === "series-circuit-current";
  const pNames: [string, string] = isSeries
    ? inp.placement === "across-supply"
      ? ["+", "−"]
      : inp.placement === "across-resistor"
        ? ["R ด้านรับกระแส", "R ด้านจ่ายกระแส"]
        : ["X (มาจาก R)", "Y (ไปขั้ว −)"]
    : def.points;
  const probeMode: "off" | "fwd" | "rev" = !inp.probesOn ? "off" : inp.reversed ? "rev" : "fwd";
  const multiRange = inp.dial !== "off" && RANGES[inp.dial].length > 1;
  const unk = unknownResistor(inp.unknownSeed);

  const lcd = s.dial === "off" ? "(จอดับ)" : `${s.display} ${s.displayUnit}`.trim();
  const stageLabel =
    `มัลติมิเตอร์ดิจิทัล สวิตช์ที่ ${DIAL_TEXT[s.dial]} สายแดงที่ช่อง ${inp.jack} สายดำที่ COM ` +
    `ชิ้นงาน ${def.label} ${s.probesOn ? "โพรบแตะชิ้นงานแล้ว" : "โพรบยังไม่แตะ"} จอแสดง ${lcd}` +
    (s.beep ? " มีเสียงบี๊บ" : "") +
    (s.fuseBlown ? " ฟิวส์ขาด" : "");

  const controls = (
    <>
      <LabSelect<ItemId> label="ชิ้นงานบนโต๊ะ (bench item)" value={inp.item} onChange={(v) => set({ item: v })} options={itemOrder.map((i) => ({ value: i, label: ITEMS[i].label }))} />

      <Segmented<Dial>
        label="สวิตช์หมุนเลือกฟังก์ชัน (rotary dial)"
        size="sm"
        value={inp.dial}
        onChange={(v) => set({ dial: v })}
        options={(Object.keys(DIAL_TEXT) as Dial[]).map((d) => ({ value: d, label: DIAL_TEXT[d] }))}
      />

      <Segmented<Jack>
        label="ช่องเสียบสายแดง (สายดำอยู่ COM เสมอ)"
        size="sm"
        value={inp.jack}
        onChange={(v) => set({ jack: v })}
        options={[
          { value: "VΩ", label: "VΩ (แรงดัน/โอห์ม)" },
          { value: "mA", label: "mA (≤ 400 mA)" },
          { value: "10A", label: "10A" },
        ]}
      />

      <ControlGroup title="วางโพรบ (probe)">
        {isSeries ? (
          <LabSelect<Placement>
            label="ต่อมิเตอร์ที่ใดในวงจร"
            value={inp.placement}
            onChange={(v) => set({ placement: v })}
            options={[
              { value: "series", label: "ตัดวงจรที่ X–Y แล้วต่ออนุกรม" },
              { value: "across-supply", label: "คร่อมแหล่งจ่าย 12 V (ขนาน)" },
              { value: "across-resistor", label: "คร่อมตัวต้านทาน 1 kΩ (ขนาน)" },
            ]}
          />
        ) : null}
        {isBoard ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <LabSelect<BoardPoint> label="โพรบแดงที่จุด" value={inp.redPoint} onChange={(v) => set({ redPoint: v })} options={BOARD_POINTS.map((p) => ({ value: p, label: p }))} />
              <LabSelect<BoardPoint> label="โพรบดำที่จุด" value={inp.blackPoint} onChange={(v) => set({ blackPoint: v })} options={BOARD_POINTS.map((p) => ({ value: p, label: p }))} />
            </div>
            <Segmented<"off" | "on">
              label="สถานะโพรบ"
              size="sm"
              value={inp.probesOn ? "on" : "off"}
              onChange={(v) => set({ probesOn: v === "on" })}
              options={[
                { value: "off", label: "ยกออก" },
                { value: "on", label: "แตะจุดที่เลือก" },
              ]}
            />
          </>
        ) : (
          <Segmented<"off" | "fwd" | "rev">
            label="ตำแหน่งโพรบ"
            size="sm"
            value={probeMode}
            onChange={(v) => set({ probesOn: v !== "off", reversed: v === "rev" })}
            options={[
              { value: "off", label: "ยกออก" },
              { value: "fwd", label: `แดง→${pNames[0]} ดำ→${pNames[1]}` },
              { value: "rev", label: `แดง→${pNames[1]} ดำ→${pNames[0]} (สลับ)` },
            ]}
          />
        )}
      </ControlGroup>

      <ControlGroup title="ปุ่มบนเครื่องและการแก้ไข">
        <div className="flex flex-wrap gap-2">
          <LabButton onClick={() => act(pressRange)} disabled={!multiRange} pressed={!s.autoRange}>
            RANGE {multiRange ? `(${s.rangeLabel})` : ""}
          </LabButton>
          <LabButton onClick={() => set({ rangeIndex: null })} disabled={!multiRange || s.autoRange}>
            AUTO
          </LabButton>
          <LabButton tone={s.fuseBlown ? "primary" : "secondary"} onClick={() => act(replaceFuse)} disabled={!s.fuseBlown}>
            เปลี่ยนฟิวส์
          </LabButton>
        </div>
        {inp.item === "capacitor-charged" ? (
          <div className="flex flex-wrap gap-2">
            <LabButton tone="ok" onClick={() => set({ capDischarged: true })} disabled={inp.capDischarged}>
              คายประจุผ่านตัวต้านทาน
            </LabButton>
            <LabButton onClick={() => set({ capDischarged: false })} disabled={!inp.capDischarged}>
              ชาร์จใหม่ (ตั้งโจทย์)
            </LabButton>
          </div>
        ) : null}
        {inp.item === "resistor-unknown" ? (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
              <LabButton onClick={() => set({ unknownSeed: inp.unknownSeed + 1 })}>สุ่มตัวต้านทานใหม่</LabButton>
              <LabButton onClick={() => set({ unknownSeed: 0 })} disabled={inp.unknownSeed === 0}>
                กลับค่าเริ่มต้น (4.7 kΩ)
              </LabButton>
            </div>
            <p className="text-[0.82rem] text-ink-3">งานที่ต้องอ่านได้ 4.7 kΩ ให้ใช้ค่าเริ่มต้น</p>
            <details className="text-[0.85rem] text-ink-2">
              <summary className="cursor-pointer">เฉลยค่าระบุบนแถบสี</summary>
              {formatSI(unk.nominal, "Ω", 2)} ±5 % (ค่าจริงในแบบจำลอง {formatSI(unk.actual, "Ω", 4)})
            </details>
          </div>
        ) : null}
        {isBoard ? (
          <details className="text-[0.85rem] text-ink-2">
            <summary className="cursor-pointer">ตั้งโจทย์: ตัวต้านทานที่ขาด (สำหรับครู)</summary>
            <div className="mt-2">
              <LabSelect<"none" | "0" | "1" | "2">
                label="จำลองตัวต้านทานขาด"
                value={inp.openResistor === null ? "none" : (String(inp.openResistor) as "0" | "1" | "2")}
                onChange={(v) => set({ openResistor: v === "none" ? null : Number(v) })}
                options={[
                  { value: "none", label: "ไม่มี (ปกติทุกตัว)" },
                  { value: "0", label: "R1 ขาด" },
                  { value: "1", label: "R2 ขาด" },
                  { value: "2", label: "R3 ขาด" },
                ]}
              />
            </div>
          </details>
        ) : null}
        <label className="flex items-center gap-2 text-[0.9rem] text-ink-2">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
          เปิดเสียงบี๊บจากลำโพง
        </label>
      </ControlGroup>
    </>
  );

  const readouts: ReactNode[] = [
    <Readout key="lcd" label={`จอแสดง (${DIAL_LABEL[s.dial]})`} text={lcd} tone={s.display === "----" ? "danger" : "neutral"} />,
    <Readout key="rg" label="ย่านวัด (range)" text={s.dial === "off" ? "—" : `${s.rangeLabel} · ${s.autoRange ? "AUTO" : "MANUAL"}`} />,
    <Readout key="fz" label="ฟิวส์ mA / 10A" text={`${s.blownMA ? "ขาด" : "ปกติ"} / ${s.blown10A ? "ขาด" : "ปกติ"}`} tone={s.fuseBlown ? "danger" : "ok"} />,
  ];
  if (!compact || s.dial === "continuity")
    readouts.push(<Readout key="bp" label={`เสียงบี๊บ (< ${BEEP_OHMS} Ω)`} text={s.dial !== "continuity" ? "—" : s.beep ? "ดัง •)))" : "เงียบ"} tone={s.beep ? "ok" : "neutral"} />);
  if (!compact) readouts.push(<Readout key="pol" label="ขั้วสายวัด" text={!s.probesOn ? "ยังไม่แตะ" : s.polarityReversed ? "สลับขั้ว" : "ตามปกติ"} tone={s.probesOn && s.polarityReversed ? "warn" : "neutral"} />);
  if (inp.item === "led-red") readouts.push(<Readout key="led" label="LED" text={s.ledGlow ? "ติดสลัว ๆ" : "ดับ"} tone={s.ledGlow ? "ok" : "neutral"} />);

  const footer = (
    <div className="space-y-2">
      {s.demoOnly ? (
        <SimNotice tone="danger">
          <strong>ครูสาธิตเท่านั้น (S3)</strong> — เต้ารับ 230 V ในแล็บนี้เป็นภาพจำลอง นักเรียนห้ามวัดเต้ารับหรือไฟบ้านจริงด้วยตนเอง
          งานวัดไฟบ้านจริงใช้มิเตอร์และสายวัดพิกัด <strong>CAT II</strong> (เต้ารับ) หรือ <strong>CAT III</strong> (ตู้ไฟ/แผงจ่าย) ที่ไม่ชำรุด โดยครูเป็นผู้สาธิต
        </SimNotice>
      ) : null}
      {inp.blowCause && s.fuseBlown ? <SimNotice tone="danger">ฟิวส์ขาดเพราะ{inp.blowCause}</SimNotice> : null}
      {s.codes.map((c, i) => (
        <SimNotice key={c} tone={DANGER.includes(c) ? "danger" : c === "cap-charging" ? "info" : "warn"}>
          {s.warnings[i]}
        </SimNotice>
      ))}
      {s.probesOn && s.polarityReversed && (s.dial === "VDC" || s.dial === "mA" || s.dial === "A") && s.value !== null && s.value < 0 ? (
        <SimNotice tone="info">สายวัดสลับขั้ว: จอแสดงเครื่องหมายลบ (−) ค่าขนาดเท่าเดิม ไม่เป็นอันตรายต่อ DMM</SimNotice>
      ) : null}
      <AssumptionsPanel items={ASSUMPTIONS} />
    </div>
  );

  return <LabShell compact={compact} stageLabel={stageLabel} stage={<MultimeterStage s={s} inp={inp} />} controls={controls} readouts={readouts} footer={footer} />;
}
