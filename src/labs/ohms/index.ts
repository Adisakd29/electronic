import { createElement } from "react";
import type { LabCheck, LabModule } from "../types";
import Lab from "./Lab";
import { OhmsStage } from "./Stage";
import { ASSUMPTIONS } from "./assumptions";
import { formatSI } from "../shared/format";
import type { OhmsState } from "./model";
import {
  bodyBand,
  checkBodyCurrentBelow,
  checkCurrentEquals,
  checkDistinctR,
  checkPointsRecorded,
  checkPowerEquals,
  checkSetVR,
  presetConfig,
} from "./model";

const checks: Record<string, LabCheck> = {
  currentEquals: { description: "กระแส I ≈ ค่าเป้าหมาย", params: "{ target: A, tol?: relative [0.03] }", fn: checkCurrentEquals },
  setVR: { description: "ตั้ง V และ R ตามที่กำหนด", params: "{ V: V, R: Ω, tol?: relative [0.02] }", fn: checkSetVR },
  pointsRecorded: {
    description: "บันทึกจุด (V, I) ครบตามจำนวน (เลือกได้ว่าต้องเป็น R เดียวกัน)",
    params: "{ min: number, sameR?: boolean — at least min points sharing one R }",
    fn: checkPointsRecorded,
  },
  distinctR: { description: "จุดที่บันทึกครอบคลุมค่า R ต่างกันอย่างน้อย min ค่า", params: "{ min: number }", fn: checkDistinctR },
  bodyCurrentBelow: { description: "กระแสผ่านร่างกาย I ≤ max", params: "{ max: A }", fn: checkBodyCurrentBelow },
  powerEquals: { description: "กำลังไฟฟ้า P ≈ ค่าเป้าหมาย", params: "{ target: W, tol?: relative [0.03] }", fn: checkPowerEquals },
};

export const lab: LabModule = {
  id: "ohms",
  title: "ห้องทดลองกฎของโอห์ม",
  titleEn: "Ohm's Law Laboratory",
  description: "ปรับแรงดัน V และความต้านทาน R อ่านกระแสจากแอมมิเตอร์และแรงดันจากโวลต์มิเตอร์ บันทึกจุดลงกราฟ V–I และสำรวจกระแสผ่านร่างกายแบบจำลอง",
  assumptions: ASSUMPTIONS,
  presets: {
    default: { label: "พื้นฐาน (12 V, 1 kΩ)", description: "V 0–30 V, R 10 Ω–10 kΩ ตรวจสอบ I = V/R และความชันกราฟ V–I" },
    body: {
      label: "กระแสผ่านร่างกายมนุษย์ (จำลอง)",
      description: "V 0–400 V, R 500 Ω–1 MΩ พร้อมแถบผลกระทบโดยประมาณจาก IEC 60479-1 — จำลองเท่านั้น ห้ามทดลองกับไฟบ้าน",
    },
    power: { label: "กำลังไฟฟ้าและพิกัดตัวต้านทาน", description: "V 0–24 V, R 10–1000 Ω เพิ่มกราฟ P–V และเส้นพิกัดกำลัง" },
    "led-resistor": { label: "ตัวต้านทานจำกัดกระแส LED", description: "V 5 V, R 100–1000 Ω แสดงกระแสเป็น mA เพื่อเลือกค่า R ให้ LED" },
  },
  checks,
  Component: Lab,
  readouts: (s) => {
    const st = s as OhmsState;
    const rows = [
      { label: "V", value: formatSI(st.V, "V") },
      { label: "R", value: formatSI(st.R, "Ω") },
      { label: "I", value: formatSI(st.I, "A") },
      { label: "P", value: formatSI(st.P, "W") },
      { label: "จุดที่บันทึก", value: `${st.points?.length ?? 0} จุด` },
    ];
    if (st.preset === "body") rows.push({ label: "โซนผลกระทบ (ประมาณ IEC 60479-1)", value: bodyBand(st.I).label });
    return rows;
  },
  previewStage: (preset: string) => {
    const cfg = presetConfig(preset);
    return createElement(OhmsStage, { V: cfg.V, R: cfg.R, cfg, animate: false });
  },
};

export default lab;
