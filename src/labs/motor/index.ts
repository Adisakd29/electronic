import { createElement } from "react";
import type { LabModule } from "../types";
import Lab from "./Lab";
import { ASSUMPTIONS } from "./assumptions";
import { presetInputs, solve, type MotorState } from "./model";
import { formatSI } from "../shared/format";
import { MotorStage } from "./Stage";

const num = (v: unknown, d: number) => (v === undefined || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));

export const lab: LabModule<MotorState> = {
  id: "motor",
  title: "ห้องทดลองการควบคุมมอเตอร์กระแสตรง",
  titleEn: "DC Motor Control",
  description: "ปรับความเร็วมอเตอร์ไฟตรงด้วย PWM กลับทิศด้วย H-bridge และสตาร์ต–สตอปด้วยคอนแทกเตอร์ในวงจรควบคุม 24 V",
  assumptions: ASSUMPTIONS,
  presets: {
    default: { label: "PWM 12 V / 100 %", description: "แท็บ pwm แหล่งจ่าย 12 V duty 100 % ไม่มีภาระ (≈ 5491 rpm, 0.25 A)" },
    pwm: { label: "PWM duty 50 %", description: "แท็บ pwm 12 V duty 50 % → V_eff = 6 V (≈ 2626 rpm)" },
    hbridge: { label: "H-bridge", description: "สวิตช์ S1–S4 ปิดทั้งหมด (หมุนอิสระ) ทดลองเดินหน้า ถอยหลัง เบรก และ shoot-through" },
    contactor: { label: "คอนแทกเตอร์ Start–Stop", description: "วงจรควบคุม 24 V: STOP (NC), START (NO) ขนาน K1 13–14, คอยล์ K1, OL 95–96" },
  },
  checks: {
    speedAbove: {
      description: "ความเร็วรอบไม่น้อยกว่าค่าที่กำหนด และมอเตอร์ไม่ติดขัด",
      params: "{ rpm: number }",
      fn: (s, p) => !s.stalled && s.rpm >= num(p.rpm, 0),
    },
    speedBetween: {
      description: "ความเร็วรอบอยู่ในช่วงที่กำหนด",
      params: "{ min: rpm, max: rpm }",
      fn: (s, p) => s.rpm >= num(p.min, 0) && s.rpm <= num(p.max, Infinity),
    },
    dutyEquals: {
      description: "duty cycle เท่ากับค่าที่กำหนด",
      params: "{ percent: number, absTol?: percent [1] }",
      fn: (s, p) => Math.abs(s.duty * 100 - num(p.percent, NaN)) <= num(p.absTol, 1),
    },
    direction: {
      description: "ทิศทางหมุนตรงตามที่กำหนด",
      params: '{ dir: "cw" | "ccw" | "stop" }',
      fn: (s, p) => s.direction === String(p.dir),
    },
    noShortCircuit: { description: "ไม่มีการลัดวงจร (ฟิวส์ไม่ขาด)", params: "{}", fn: (s) => !s.shortCircuit },
    braking: { description: "H-bridge อยู่ในสถานะเบรก", params: "{}", fn: (s) => s.braking },
    motorRunningLatched: {
      description: "แท็บคอนแทกเตอร์: มอเตอร์ทำงานแบบยึดตัวเองหลังปล่อยปุ่ม START",
      params: "{}",
      fn: (s) => s.tab === "contactor" && s.contactor.running && !s.contactor.startPressed,
    },
    overloadTripped: { description: "โอเวอร์โหลดรีเลย์ทริป", params: "{}", fn: (s) => s.contactor.overloadTripped },
  },
  Component: Lab,
  readouts: (s) => {
    const DIR: Record<string, string> = { cw: "ตามเข็ม (CW)", ccw: "ทวนเข็ม (CCW)", stop: "หยุด" };
    const TAB: Record<string, string> = { pwm: "PWM", hbridge: "H-bridge", contactor: "คอนแทกเตอร์" };
    const rows = [
      { label: "แท็บ", value: TAB[s.tab] ?? s.tab },
      { label: "V / duty", value: `${formatSI(s.V, "V")} / ${Math.round(s.duty * 100)} %` },
      { label: "V_eff", value: formatSI(s.vEff, "V") },
      { label: "ภาระ T_L", value: `${formatSI(s.load, "N·m")}` },
      { label: "ความเร็ว", value: `${Math.round(s.rpm)} rpm${s.stalled ? " (ติดขัด)" : ""}` },
      { label: "I", value: formatSI(s.current, "A") + (s.overheat ? " (ร้อนเกิน)" : "") },
      { label: "Back-EMF E", value: formatSI(s.backEmf, "V") },
      { label: "ทิศ", value: DIR[s.direction] ?? s.direction },
    ];
    if (s.tab === "hbridge")
      rows.push({
        label: "S1–S4",
        value: `${s.switches.map((x, i) => (x ? `S${i + 1}` : "")).filter(Boolean).join("+") || "ปิดทั้งหมด"}${s.shortCircuit ? " — ลัดวงจร/ฟิวส์ขาด" : s.braking ? " — เบรก" : ""}`,
      });
    if (s.tab === "contactor")
      rows.push({
        label: "K1 / OL",
        value: `${s.contactor.running ? "ทำงาน" : "หยุด"}${s.contactor.holding ? " (ค้าง)" : ""} / ${s.contactor.overloadTripped ? "ทริป" : "ปกติ"}`,
      });
    else rows.push({ label: "ประสิทธิภาพ", value: `${Math.round(s.efficiency * 100)} %` });
    return rows;
  },
  previewStage: (preset) => {
    const inp = presetInputs(preset);
    return createElement(MotorStage, { s: solve(inp), inp });
  },
};

export default lab;
