import { createElement } from "react";
import { near, type LabModule } from "../types";
import Lab from "./Lab";
import { ASSUMPTIONS } from "./assumptions";
import { CORES, computeState, presetInputs, type LabState, type StepType } from "./model";
import { formatSI } from "../shared/format";
import { InductorStage, TransformerStage } from "./Stage";

type P = Record<string, number | string | boolean>;
const num = (v: unknown, d: number) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const tol = (p: P, d: number) => num(p.tol, d);
const ind = (s: LabState | undefined) => s?.inductor;
const tr = (s: LabState | undefined) => s?.transformer;

export const lab: LabModule<LabState> = {
  id: "inductor-transformer",
  title: "ตัวเหนี่ยวนำและหม้อแปลง",
  titleEn: "Inductor & Transformer",
  description: "ทดลองปรับจำนวนรอบ ขนาดขด และวัสดุแกน เพื่อดูค่าความเหนี่ยวนำ สนามแม่เหล็ก รีแอกแตนซ์ ค่าคงที่เวลา RL และการแปลงแรงดัน–กระแสของหม้อแปลง",
  assumptions: ASSUMPTIONS,
  presets: {
    default: { label: "ขดลวดแกนอากาศ", description: "200 รอบ ยาว 5 cm เส้นผ่านศูนย์กลาง 1 cm แกนอากาศ (L ≈ 79 µH)" },
    "iron-core": { label: "ขดลวดแกนเหล็ก", description: "ขดเดิมใส่แกนเหล็ก μr ≈ 1000 → L ≈ 79 mH, X_L ที่ 50 Hz ≈ 24.8 Ω" },
    "rl-time": { label: "ค่าคงที่เวลา RL", description: "500 รอบ ยาว 10 cm Ø 2 cm แกนเหล็ก, R = 100 Ω, V = 12 V → τ ≈ 9.87 ms" },
    transformer: { label: "หม้อแปลงลดแรงดัน 230 → 12 V", description: "Vp 230 V (แบบจำลองเท่านั้น) Np:Ns = 1000:52 → Vs ≈ 12 V, โหลด 12 Ω" },
    "step-up": { label: "หม้อแปลงแรงดันขึ้น", description: "Vp 12 V, Np:Ns = 100:400 → Vs = 48 V, โหลด 1 kΩ" },
  },
  checks: {
    inductanceEquals: {
      description: "ค่าความเหนี่ยวนำ L ใกล้ค่าเป้าหมาย",
      params: "{ target: H, tol?: relative [0.05] }",
      fn: (s, p) => near(ind(s)?.L ?? NaN, num(p.target, NaN), tol(p, 0.05)),
    },
    xlEquals: {
      description: "รีแอกแตนซ์ X_L ใกล้ค่าเป้าหมาย",
      params: "{ target: Ω, tol?: relative [0.05] }",
      fn: (s, p) => near(ind(s)?.XL ?? NaN, num(p.target, NaN), tol(p, 0.05)),
    },
    tauEquals: {
      description: "ค่าคงที่เวลา τ = L/R ใกล้ค่าเป้าหมาย",
      params: "{ target: s, tol?: relative [0.05] }",
      fn: (s, p) => near(ind(s)?.tau ?? NaN, num(p.target, NaN), tol(p, 0.05)),
    },
    turnsRatio: {
      description: "อัตราส่วนรอบ Np/Ns ใกล้ค่าที่กำหนด",
      params: "{ ratio: Np/Ns, tol?: relative [0.02] }",
      fn: (s, p) => near(tr(s)?.ratio ?? NaN, num(p.ratio, NaN), tol(p, 0.02)),
    },
    secondaryVoltage: {
      description: "แรงดันทุติยภูมิ Vs ใกล้ค่าเป้าหมาย",
      params: "{ target: V, tol?: relative [0.05] }",
      fn: (s, p) => near(tr(s)?.Vs ?? NaN, num(p.target, NaN), tol(p, 0.05), 1e-9),
    },
    secondaryCurrent: {
      description: "กระแสทุติยภูมิ Is ใกล้ค่าเป้าหมาย",
      params: "{ target: A, tol?: relative [0.05] }",
      fn: (s, p) => near(tr(s)?.Is ?? NaN, num(p.target, NaN), tol(p, 0.05), 1e-9),
    },
    stepType: {
      description: "ชนิดหม้อแปลง (step-up / step-down / isolation) ตรงตามที่กำหนด",
      params: '{ type: "step-up" | "step-down" | "isolation" }',
      fn: (s, p) => tr(s)?.type === (p.type as StepType),
    },
  },
  Component: Lab,
  readouts: (s) => {
    if (s.tab === "transformer") {
      const t = s.transformer;
      const TYPE: Record<StepType, string> = { "step-up": "เพิ่มแรงดัน", "step-down": "ลดแรงดัน", isolation: "แยกวงจร 1:1" };
      return [
        { label: "Np : Ns", value: `${t.Np} : ${t.Ns} (${TYPE[t.type]})` },
        { label: "Vp", value: formatSI(t.Vp, "V") },
        { label: "Vs", value: formatSI(t.Vs, "V") },
        { label: "โหลด", value: Number.isFinite(t.Rload) ? formatSI(t.Rload, "Ω") : "เปิดวงจร" },
        { label: "Is", value: formatSI(t.Is, "A") },
        { label: "Ip", value: formatSI(t.Ip, "A") },
        { label: "Ps", value: formatSI(t.Ps, "W") },
        { label: "Pp", value: formatSI(t.Pp, "W") },
        { label: "η", value: `${Math.round(t.eta * 100)} %` },
      ];
    }
    const i = s.inductor;
    return [
      { label: "N", value: `${i.N} รอบ` },
      { label: "l / d", value: `${formatSI(i.l, "m")} / ${formatSI(i.d, "m")}` },
      { label: "แกน", value: CORES[i.core]?.label ?? i.core },
      { label: "L", value: formatSI(i.L, "H") },
      { label: "I / B", value: `${formatSI(i.I, "A")} / ${formatSI(i.B, "T")}` },
      { label: "f", value: formatSI(i.f, "Hz") },
      { label: "X_L", value: formatSI(i.XL, "Ω") },
      { label: "R / τ = L/R", value: `${formatSI(i.R, "Ω")} / ${formatSI(i.tau, "s")}` },
      { label: "t / i(t)", value: `${formatSI(i.t, "s")} / ${formatSI(i.i, "A")}` },
    ];
  },
  previewStage: (preset: string) => {
    const st = computeState(presetInputs(preset));
    return st.tab === "inductor"
      ? createElement(InductorStage, { s: st.inductor, animate: false })
      : createElement(TransformerStage, { s: st.transformer, animate: false });
  },
};

export default lab;
