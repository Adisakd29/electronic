import { createElement } from "react";
import { near, type LabModule } from "../types";
import Lab from "./Lab";
import { ASSUMPTIONS } from "./assumptions";
import { presetInputs, solve, type Coupling, type OscilloscopeState, type Wave } from "./model";
import { formatSI } from "../shared/format";
import { ScopeStage } from "./Stage";

export type { OscilloscopeState } from "./model";

const num = (v: unknown, d: number) => (v === undefined || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));

export const lab: LabModule<OscilloscopeState> = {
  id: "oscilloscope",
  title: "ออสซิลโลสโคปเสมือน",
  titleEn: "Virtual Oscilloscope + Function Generator",
  description: "ตั้งเครื่องกำเนิดสัญญาณ ปรับ VOLTS/DIV, TIME/DIV, coupling, โพรบ และทริกเกอร์ แล้วอ่าน Vpp คาบ ความถี่ และ Vrms จากจอสโคป",
  assumptions: ASSUMPTIONS,
  presets: {
    default: { label: "ไซน์ 1 kHz 4 Vpp", description: "เครื่องกำเนิดไซน์ 1 kHz 4 Vpp เข้า CH1 ที่ 1 V/div และ 0.2 ms/div ทริกเกอร์ CH1 ขาขึ้นที่ 0 V" },
    mystery: { label: "สัญญาณปริศนา", description: "ซ่อนการตั้งเครื่องกำเนิดและ MEASURE สุ่มรูปคลื่น ความถี่ และ Vpp ให้อ่านค่าจากจอเอง" },
    "probe-trap": { label: "กับดักโพรบ ×10", description: "สวิตช์ที่โพรบตั้ง ×10 แต่เมนู CH1 ตั้ง ×1 ภาพจึงเล็กกว่าจริง 10 เท่า" },
    square: { label: "คลื่นสี่เหลี่ยม 1 kHz", description: "คลื่นสี่เหลี่ยม 1 kHz 4 Vpp ที่ 1 V/div และ 0.2 ms/div เทียบ Vrms กับไซน์" },
    setup: { label: "เครื่องที่ยังไม่ได้ตั้ง", description: "เครื่องค้างค่าจากผู้ใช้คนก่อน: คลื่นสี่เหลี่ยม 200 Hz 1 Vpp, 5 V/div, 50 ms/div, โพรบไม่ตรงกับเมนู, LEVEL +3 V ต้องตั้งใหม่ทุกค่าเอง" },
    rectifier: { label: "หม้อแปลง 12 V + บริดจ์", description: "CH1 ขดทุติยภูมิ 12 V rms 50 Hz, CH2 เอาต์พุตวงจรเรียงกระแสบริดจ์ (เลือกครึ่งคลื่น/มีตัวกรองได้) ที่ 5 ms/div" },
  },
  checks: {
    triggered: { description: "ภาพนิ่ง (ทริกเกอร์ทำงาน ไม่มี Trig?)", params: "{}", fn: (s) => s.triggered === true },
    cyclesOnScreen: {
      description: "จำนวนรอบของ CH1 บนจอ 10 ช่องอยู่ในช่วง",
      params: "{ min [1], max [5] }",
      fn: (s, p) => s.cyclesOnScreen >= num(p.min, 1) - 1e-9 && s.cyclesOnScreen <= num(p.max, 5) + 1e-9,
    },
    fitsVertically: {
      description: "คลื่น CH1 ทั้งลูกอยู่บนจอ และสูงอยู่ในช่วงที่กำหนด (ช่อง)",
      params: "{ minDiv [3], maxDiv [8] }",
      fn: (s, p) => s.fullyOnScreen && s.divsVertical >= num(p.minDiv, 3) - 1e-9 && s.divsVertical <= num(p.maxDiv, 8) + 1e-9,
    },
    probeMatched: {
      description: "ตัวคูณโพรบในเมนูตรงกับสวิตช์ที่ตัวโพรบ",
      params: "{ ch? [1] }",
      fn: (s, p) => {
        const c = num(p.ch, 1) === 2 ? s.ch2 : s.ch1;
        return c.probeMenu === c.probeSwitch;
      },
    },
    genSet: {
      description: "เครื่องกำเนิดสัญญาณตั้งตรงตามที่กำหนด",
      params: "{ wave?, freq?, vpp?, offset?, tol? [0.02] }",
      fn: (s, p) => {
        const tol = num(p.tol, 0.02);
        if (p.wave !== undefined && (s.gen.wave as Wave) !== String(p.wave)) return false;
        if (p.freq !== undefined && !near(s.gen.freq, Number(p.freq), tol)) return false;
        if (p.vpp !== undefined && !near(s.gen.vpp, Number(p.vpp), tol)) return false;
        if (p.offset !== undefined && !near(s.gen.offset, Number(p.offset), tol, 0.05)) return false;
        return true;
      },
    },
    couplingIs: {
      description: "coupling ของช่องที่ระบุตรงตามที่กำหนด",
      params: '{ ch: 1 | 2, coupling: "AC" | "DC" | "GND" }',
      fn: (s, p) => {
        const c = num(p.ch, 1) === 2 ? s.ch2 : s.ch1;
        return c.coupling === (String(p.coupling).toUpperCase() as Coupling);
      },
    },
  },
  Component: Lab,
  readouts: (s) => {
    const WAVE: Record<string, string> = { sine: "ไซน์", square: "สี่เหลี่ยม", triangle: "สามเหลี่ยม", dc: "DC" };
    const fmtF = (f: number) => (Number.isFinite(f) ? formatSI(f, "Hz") : "—");
    const rows = [
      {
        label: "เครื่องกำเนิด",
        value: s.mystery
          ? "ปริศนา (ซ่อน)"
          : `${WAVE[s.gen.wave] ?? s.gen.wave} ${formatSI(s.gen.freq, "Hz")} ${formatSI(s.gen.vpp, "Vpp")}${s.gen.offset ? ` offset ${formatSI(s.gen.offset, "V")}` : ""}`,
      },
      { label: "CH1 VOLTS/DIV", value: `${formatSI(s.ch1.voltsDiv, "V")}/div · ${s.ch1.coupling} · โพรบ ×${s.ch1.probeSwitch} (เมนู ×${s.ch1.probeMenu})` },
      { label: "TIME/DIV", value: `${formatSI(s.timeDiv, "s")}/div` },
      { label: "ทริกเกอร์", value: `CH${s.trigger.source} ${s.trigger.edge === "rising" ? "ขาขึ้น" : "ขาลง"} ${formatSI(s.trigger.level, "V")} — ${s.triggered ? "นิ่ง" : "Trig?"}` },
      { label: "ความสูงบนจอ", value: `${s.divsVertical.toFixed(2)} div${s.fullyOnScreen ? "" : " (ล้นจอ)"}` },
      { label: "รอบบนจอ", value: s.cyclesOnScreen.toFixed(2) },
      { label: "Vpp (วัด)", value: s.meas1.clipped ? "? (ล้นจอ)" : formatSI(s.meas1.vpp, "V") },
      { label: "Vrms (วัด)", value: s.meas1.clipped ? "?" : formatSI(s.meas1.vrms, "V") },
      { label: "f / T (วัด)", value: `${fmtF(s.meas1.freq)} / ${Number.isFinite(s.meas1.period) ? formatSI(s.meas1.period, "s") : "—"}` },
    ];
    if (s.cursors?.on) rows.push({ label: "เคอร์เซอร์", value: `Δt ${formatSI(s.cursor.dt, "s")} (1/Δt ${fmtF(s.cursor.invDt)}) ΔV ${formatSI(s.cursor.dV, "V")}` });
    return rows;
  },
  previewStage: (preset) => createElement(ScopeStage, { s: solve(presetInputs(preset)), rollPhase: 0.2 }),
};

export default lab;
