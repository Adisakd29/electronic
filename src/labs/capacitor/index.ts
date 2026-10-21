import { createElement } from "react";
import { near, type LabModule } from "../types";
import Lab from "./Lab";
import { ASSUMPTIONS, PRESET_TEXT } from "./content";
import { analyzeCombo, presetConfig, rcSnapshot, type CapacitorState } from "./model";
import { formatSI } from "../shared/format";
import { ComboStage, RcStage } from "./Stage";

const num = (v: unknown, d: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

export const lab: LabModule = {
  id: "capacitor",
  title: "การประจุ–คายประจุตัวเก็บประจุ",
  titleEn: "Capacitor RC Simulator",
  description: "สับสวิตช์ประจุและคายประจุตัวเก็บประจุผ่านตัวต้านทาน ดูกราฟแรงดันและกระแสตามเวลา หาค่าคงที่เวลา τ = RC และคำนวณการต่อตัวเก็บประจุหลายตัว",
  assumptions: ASSUMPTIONS,
  presets: PRESET_TEXT,
  checks: {
    tauEquals: {
      description: "ค่าคงที่เวลา τ = RC เท่ากับค่าที่กำหนด",
      params: "{ target: s, tol?: relative [0.03] }",
      fn: (st, p) => near((st as CapacitorState | undefined)?.tau ?? NaN, num(p.target, NaN), num(p.tol, 0.03)),
    },
    reachedPercent: {
      description:
        "โหมดตรงกับที่กำหนด และ (ประจุ) v_C ถึงอย่างน้อย percent % ของ V หรือ (คายประจุ) แรงดันที่เหลือลดลงเหลือไม่เกิน percent %",
      params: '{ percent: %, mode?: "charge"|"discharge" ["charge"] }',
      fn: (st, p) => {
        const s = st as CapacitorState | undefined;
        if (!s?.combo) return false;
        const mode = p.mode === "discharge" ? "discharge" : "charge";
        const pct = num(p.percent, NaN);
        if (s.mode !== mode || !Number.isFinite(pct)) return false;
        if (mode === "charge") return s.percent >= pct;
        return s.v0 > 0 && s.t > 0 && s.percent <= pct;
      },
    },
    setRC: {
      description: "ตั้งค่า R และ C ตามที่กำหนด",
      params: "{ R: Ω, C: F, tol?: relative [0.02] }",
      fn: (st, p) => {
        const s = st as CapacitorState | undefined;
        if (!s?.combo) return false;
        const tol = num(p.tol, 0.02);
        return near(s.R, num(p.R, NaN), tol) && near(s.C, num(p.C, NaN), tol);
      },
    },
    comboEquals: {
      description: "ค่าความจุรวม C_eq ของการต่อหลายตัวเท่ากับค่าที่กำหนด (และวิธีต่อตรง ถ้าระบุ)",
      params: '{ target: F, tol?: relative [0.03], type?: "series"|"parallel" }',
      fn: (st, p) => {
        const s = st as CapacitorState | undefined;
        if (!s?.combo) return false;
        if (p.type !== undefined && p.type !== s.combo.type) return false;
        return near(s.combo.Ceq, num(p.target, NaN), num(p.tol, 0.03));
      },
    },
  },
  Component: Lab,
  readouts: (st) => {
    const s = st as CapacitorState;
    if (s.tab === "combo" && s.combo) {
      return [
        { label: "การต่อ", value: s.combo.type === "series" ? "อนุกรม" : "ขนาน" },
        ...s.combo.C.map((c, i) => ({ label: `C${i + 1}`, value: formatSI(c, "F") })),
        { label: "C_eq", value: formatSI(s.combo.Ceq, "F") },
        { label: "V", value: formatSI(s.V, "V") },
        { label: "Q รวม", value: formatSI(s.combo.Ceq * s.V, "C") },
      ];
    }
    return [
      { label: "โหมด", value: s.mode === "charge" ? "ประจุ" : "คายประจุ" },
      { label: "V", value: formatSI(s.V, "V") },
      { label: "R", value: formatSI(s.R, "Ω") },
      { label: "C", value: formatSI(s.C, "F") },
      { label: "τ = RC", value: formatSI(s.tau, "s") },
      { label: "t", value: `${formatSI(s.t, "s")} (${(s.t / s.tau).toFixed(2)} τ)` },
      { label: "v_C", value: formatSI(s.vc, "V") },
      { label: "i", value: formatSI(s.ic, "A") },
      { label: s.mode === "charge" ? "% ของ V" : "% ที่เหลือ", value: `${s.percent.toFixed(1)} %` },
    ];
  },
  previewStage: (preset: string) => {
    const c = presetConfig(preset);
    if (c.tab === "combo") return createElement(ComboStage, { combo: analyzeCombo(c.comboType, c.comboC, c.V), V: c.V, rating: c.rating });
    // show the state 1τ after the switch closed
    const s = rcSnapshot({ V: c.V, R: c.R, C: c.C, mode: c.mode, v0: 0, t: c.R * c.C });
    return createElement(RcStage, { ...s, rating: c.rating });
  },
};

export default lab;
