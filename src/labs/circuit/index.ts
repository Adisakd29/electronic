import { createElement } from "react";
import type { LabCheck, LabModule } from "../types";
import CircuitLab from "./Lab";
import { CircuitStage } from "./Stage";
import { checks } from "./checks";
import { ASSUMPTIONS } from "./assumptions";
import { formatSI } from "../shared/format";
import { PRESETS, distinctMeasurements, faultActive, getPreset, solve, symptomFor, type CircuitState } from "./model";

const TOPO_TH: Record<string, string> = { single: "เดี่ยว", series: "อนุกรม", parallel: "ขนาน", mixed: "ผสม" };
const FAULT_TH: Record<string, string> = {
  none: "ไม่มี",
  open1: "R1 ขาด",
  open2: "R2 ขาด",
  open3: "R3 ขาด",
  short1: "R1 ลัด",
  short2: "R2 ลัด",
  short3: "R3 ลัด",
};

/** Notebook readouts for the current circuit state (hidden faults stay hidden). At most 10 rows. */
export function circuitReadouts(s: CircuitState): { label: string; value: string }[] {
  const name = (i: number) => (i === 0 && s.lamp ? "หลอด" : `R${i + 1}`);
  const out: { label: string; value: string }[] = [
    { label: "วงจร", value: `${TOPO_TH[s.topology] ?? s.topology}${s.lamp ? " + หลอด 12 V" : ""}` },
    { label: "V", value: `${formatSI(s.V, "V")}${s.switchClosed ? "" : " (สวิตช์ OFF)"}` },
    { label: "R_eq", value: formatSI(s.Req, "Ω") },
    { label: "I", value: formatSI(s.I, "A") + (s.currentLimited ? " (จำกัดกระแส)" : "") },
  ];
  const hidden = s.faultHidden && faultActive(s.topology, s.fault);
  if (!hidden) {
    const V = (i: number) => ({ label: `V_${name(i)}`, value: formatSI(s.VR[i], "V") });
    const I = (i: number) => ({ label: `I_${name(i)}`, value: formatSI(s.IR[i], "A") });
    switch (s.topology) {
      case "single":
        out.push(V(0));
        break;
      case "series":
        out.push(V(0), V(1), V(2));
        break;
      case "parallel":
        out.push(I(0), I(1), I(2));
        break;
      case "mixed":
        out.push(V(0), { label: "V_R2‖R3", value: formatSI(s.VR[1], "V") }, I(1), I(2));
        break;
    }
  }
  out.push({ label: "จุดบกพร่อง", value: hidden ? "ซ่อนอยู่" : (FAULT_TH[s.fault] ?? s.fault) });
  if (hidden) out.push({ label: "วัดแล้ว", value: `${distinctMeasurements(s.measurements ?? [])} จุด` });
  if (s.diagnosis)
    out.push({
      label: "วินิจฉัย",
      value: `${FAULT_TH[s.diagnosis.guess] ?? s.diagnosis.guess} — ${s.diagnosis.correct ? "ถูกต้อง" : "ไม่ถูกต้อง"} (วัดก่อน ${s.diagnosis.measurementsBefore} จุด)`,
    });
  return out;
}

export const lab: LabModule = {
  id: "circuit",
  title: "ห้องทดลองวงจรไฟฟ้ากระแสตรง",
  titleEn: "DC Circuit Simulator",
  description:
    "ต่อวงจรเดี่ยว อนุกรม ขนาน และผสม ปรับแรงดันและค่าตัวต้านทาน วัดกระแสและแรงดันที่จุดต่าง ๆ พร้อมโหมดหลอดไฟและห้องทดลองวงจรขัดข้อง (สังเกตอาการ วัด วินิจฉัย ซ่อม)",
  assumptions: ASSUMPTIONS,
  presets: Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, { label: v.label, description: v.description }])),
  // checks validate the state shape themselves before reading it
  checks: checks as unknown as Record<string, LabCheck>,
  Component: CircuitLab,
  readouts: (s) => circuitReadouts(s as CircuitState),
  previewStage: (preset: string) => {
    const p = getPreset(preset);
    return createElement(CircuitStage, {
      sol: solve(p.input),
      faultHidden: !!p.hidden,
      probes: { red: "A", black: "G" },
      symptom: p.hidden ? symptomFor(p.input) : null,
    });
  },
};

export default lab;
