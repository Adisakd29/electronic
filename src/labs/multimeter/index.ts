import { createElement } from "react";
import { near, type LabModule } from "../types";
import Lab from "./Lab";
import { ASSUMPTIONS } from "./assumptions";
import { checkCurrentInSeries, checkMeasured, ITEMS, presetInputs, PRESETS, solve, type MultimeterState } from "./model";
import { DIAL_LABEL, MultimeterStage } from "./Stage";

export const lab: LabModule<MultimeterState> = {
  id: "multimeter",
  title: "มัลติมิเตอร์เสมือน",
  titleEn: "Virtual Multimeter",
  description: "หมุนสวิตช์เลือกย่าน เสียบสายให้ถูกช่อง แล้ววางโพรบวัดแรงดัน กระแส ความต้านทาน ความต่อเนื่อง และไดโอด บนมัลติมิเตอร์ดิจิทัล 4,000 counts",
  assumptions: ASSUMPTIONS,
  presets: PRESETS,
  checks: {
    measured: {
      description: "วางโพรบบนชิ้นงานที่ระบุ ด้วยย่านและช่องเสียบที่ถูกต้อง และจอแสดงค่าที่ใช้ได้ (OL ของวงจรเปิดถือว่าใช้ได้)",
      params: "{ item: string, dial: string }",
      fn: (s, p) => checkMeasured(s, String(p.item), String(p.dial)),
    },
    readingNear: {
      description: "ค่าที่จอแสดง (หน่วยฐาน V, A, Ω) ใกล้ค่าเป้าหมาย",
      params: "{ target: base unit, tol?: relative (0.03) }",
      fn: (s, p) => s.valid && s.value !== null && near(s.value, Number(p.target), p.tol === undefined ? 0.03 : Number(p.tol), 1e-9),
    },
    fuseIntact: { description: "ฟิวส์ของมิเตอร์ยังไม่ขาด", params: "{}", fn: (s) => !s.fuseBlown },
    currentInSeries: {
      description: "วัดกระแสวงจร 12 V / 1 kΩ โดยแทรกมิเตอร์อนุกรมที่จุด X–Y ด้วยย่าน mA ช่อง mA ขั้วถูกต้อง (≈ 12.00 mA)",
      params: "{}",
      fn: (s) => checkCurrentInSeries(s),
    },
  },
  Component: Lab,
  readouts: (s) => {
    const rows = [
      { label: "ย่าน (dial)", value: `${DIAL_LABEL[s.dial] ?? s.dial}${s.rangeLabel ? ` ${s.rangeLabel}` : ""}${s.autoRange ? " AUTO" : ""}` },
      { label: "ช่องเสียบสายแดง", value: s.jack },
      { label: "ชิ้นงาน", value: ITEMS[s.item as keyof typeof ITEMS]?.label ?? s.item },
      {
        label: "โพรบ",
        value: !s.probesOn
          ? "ยังไม่วาง"
          : s.item === "resistor-board"
            ? `${s.redPoint} (แดง) – ${s.blackPoint} (ดำ)`
            : `${(ITEMS[s.item as keyof typeof ITEMS]?.points ?? ["?", "?"]).join(" – ")}${s.polarityReversed ? " (สลับขั้ว)" : ""}`,
      },
      { label: "จอแสดง", value: s.display ? `${s.display} ${s.displayUnit}`.trim() : "ว่าง (OFF)" },
      { label: "ค่า (หน่วยฐาน)", value: s.value === null ? (s.ol ? "OL" : "—") : `${s.value} ${s.unit}`.trim() },
      { label: "ฟิวส์", value: s.fuseBlown ? `ขาด (${[s.blownMA ? "mA" : "", s.blown10A ? "10A" : ""].filter(Boolean).join(", ")})` : "ปกติ" },
    ];
    if (s.beep) rows.push({ label: "เสียง", value: "บี๊บ (ต่อเนื่อง)" });
    if (s.warnings?.length) rows.push({ label: "คำเตือน", value: s.warnings.join(" · ") });
    return rows;
  },
  previewStage: (preset) => {
    let inp = presetInputs(preset);
    // show a meaningful reading in the static QA render
    if (preset === "default") inp = { ...inp, dial: "VDC", probesOn: true };
    if (preset === "resistance") inp = { ...inp, dial: "ohm", probesOn: true };
    if (preset === "diode") inp = { ...inp, dial: "diode", probesOn: true };
    if (preset === "continuity") inp = { ...inp, dial: "continuity", probesOn: true };
    if (preset === "current") inp = { ...inp, dial: "mA", jack: "mA", probesOn: true };
    if (preset === "troubleshoot") inp = { ...inp, probesOn: true };
    return createElement(MultimeterStage, { s: solve(inp), inp });
  },
};

export default lab;
