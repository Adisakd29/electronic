import { createElement } from "react";
import type { LabModule } from "../types";
import Lab from "./Lab";
import { checks } from "./checks";
import { ASSUMPTIONS, PRESETS, TITLE } from "./meta";
import { LED_COLORS, MATERIALS, presetInputs, solveAll, type SemiState } from "./model";
import { formatSI } from "../shared/format";
import { SemiStage } from "./Stage";

export const lab: LabModule = {
  id: "semiconductor",
  title: TITLE,
  titleEn: "Semiconductor Laboratory",
  description: "ทดลองไดโอดไบแอสตรง/กลับ LED กับตัวต้านทานจำกัดกระแส วงจรเรียงกระแสพร้อมตัวกรอง และทรานซิสเตอร์ NPN ทำงานเป็นสวิตช์",
  assumptions: ASSUMPTIONS,
  presets: PRESETS,
  checks,
  Component: Lab,
  readouts: (st) => {
    const s = st as SemiState;
    switch (s.tab) {
      case "led": {
        const l = s.led;
        const STATUS: Record<string, string> = { off: "ดับ", ok: "ติด (ปกติ)", dim: "ติดสลัว", burnt: "เสีย (เกินพิกัด)" };
        return [
          { label: "แท็บ", value: "LED" },
          { label: "สี / V_F", value: `${LED_COLORS[l.color]?.label ?? l.color} / ${formatSI(l.Vf, "V")}` },
          { label: "Vs", value: formatSI(l.Vs, "V") },
          { label: "R", value: formatSI(l.R, "Ω") },
          { label: "I_F", value: formatSI(l.If, "A") },
          { label: "สถานะ", value: STATUS[l.status] ?? l.status },
        ];
      }
      case "rect": {
        const r = s.rect;
        const TYPE: Record<string, string> = { half: "ครึ่งคลื่น", "center-tap": "เต็มคลื่นแทปกลาง", bridge: "บริดจ์" };
        return [
          { label: "แท็บ", value: "วงจรเรียงกระแส" },
          { label: "แบบ", value: TYPE[r.type] ?? r.type },
          { label: "V ทุติยภูมิ (rms)", value: formatSI(r.Vrms, "V") },
          { label: "R_L", value: formatSI(r.Rl, "Ω") },
          { label: "C กรอง", value: r.C > 0 ? formatSI(r.C, "F") : "ไม่มี" },
          { label: "Vp (ออก)", value: formatSI(r.Vp, "V") },
          { label: "V_DC", value: formatSI(r.Vdc, "V") },
          { label: "ริปเปิล (p-p)", value: formatSI(r.ripple, "V") },
        ];
      }
      case "bjt": {
        const b = s.bjt;
        const REGION: Record<string, string> = { cutoff: "คัตออฟ", active: "แอกทีฟ", saturation: "อิ่มตัว" };
        return [
          { label: "แท็บ", value: "ทรานซิสเตอร์สวิตช์" },
          { label: "Vcc / Vin", value: `${formatSI(b.Vcc, "V")} / ${formatSI(b.Vin, "V")}` },
          { label: "R_B / R_C", value: `${formatSI(b.Rb, "Ω")} / ${formatSI(b.Rc, "Ω")}` },
          { label: "β", value: String(b.beta) },
          { label: "I_B", value: formatSI(b.Ib, "A") },
          { label: "I_C", value: formatSI(b.Ic, "A") },
          { label: "V_CE", value: formatSI(b.Vce, "V") },
          { label: "ย่านทำงาน", value: REGION[b.region] ?? b.region },
        ];
      }
      default: {
        const d = s.diode;
        return [
          { label: "แท็บ", value: "ไดโอด" },
          { label: "วัสดุ", value: MATERIALS[d.material]?.label ?? d.material },
          { label: "Vs", value: formatSI(d.Vs, "V") },
          { label: "R", value: formatSI(d.R, "Ω") },
          { label: "V_D", value: formatSI(d.Vd, "V") },
          { label: "I_D", value: formatSI(d.Id, "A") },
          { label: "ไบแอส", value: d.bias === "forward" ? "ตรง (forward)" : "กลับ (reverse)" },
          { label: "V_R", value: formatSI(d.Vs - d.Vd, "V") },
        ];
      }
    }
  },
  previewStage: (preset: string) => createElement(SemiStage, { state: solveAll(presetInputs(preset)) }),
};

export default lab;
