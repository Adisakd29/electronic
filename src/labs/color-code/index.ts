import { createElement } from "react";
import { near, type LabModule } from "../types";
import Lab from "./Lab";
import { COLOURS, decodeSmd, formatPercent, isColour, randomResistor, seeded, type ColorCodeState } from "./model";
import { formatSI } from "../shared/format";
import { ASSUMPTIONS, PRESETS, initialFor } from "./presets";
import { ResistorStage, SmdStage, resistorCaption, smdCaption } from "./Stage";

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
const asState = (s: unknown): ColorCodeState | null => (s && typeof s === "object" ? (s as ColorCodeState) : null);

function previewStage(preset: string) {
  const init = initialFor(preset in PRESETS ? preset : "default");
  if (init.mode === "smd") {
    const cap = smdCaption(init.smdCode);
    return createElement(SmdStage, { code: init.smdCode, title: cap.title, subtitle: cap.subtitle });
  }
  if (init.mode === "quiz") {
    const q = randomResistor(seeded(2024));
    return createElement(ResistorStage, {
      bandCount: q.bandCount,
      bands: q.bands,
      title: "ค่า = ? Ω  ±?%",
      subtitle: "อ่านแถบสีแล้วพิมพ์ค่าและเลือกค่าผิดพลาด",
      idSuffix: "pv",
    });
  }
  const cap = resistorCaption(init.bands, init.bandCount);
  return createElement(ResistorStage, {
    bandCount: init.bandCount,
    bands: init.bands,
    title: init.mode === "make" ? "เป้าหมาย 2.2 kΩ · ตอนนี้ 1 kΩ" : cap.title,
    subtitle: init.mode === "make" ? "✗ ยังไม่ตรง — ปรับแถบสี" : cap.subtitle,
    activeBand: init.mode === "make" ? 2 : null,
    idSuffix: "pv",
  });
}

export const lab: LabModule<ColorCodeState> = {
  id: "color-code",
  title: "ฝึกอ่านแถบสีตัวต้านทาน",
  titleEn: "Resistor Colour Code",
  description: "อ่านและตั้งแถบสีตัวต้านทาน 4–6 แถบตาม IEC 60062 ดูค่าผิดพลาด ช่วงค่า ค่ามาตรฐาน E-series และถอดรหัสชิป SMD",
  assumptions: ASSUMPTIONS,
  presets: PRESETS,
  checks: {
    valueEquals: {
      description: "ค่าความต้านทานจากแถบสีเท่ากับค่าเป้าหมาย (และจำนวนแถบตรง ถ้าระบุ)",
      params: "{ target: Ω, tol?: relative [0.001], bandCount?: 4|5|6 }",
      fn: (s, p) => {
        const st = asState(s);
        if (!st) return false;
        if (p.bandCount !== undefined && st.bandCount !== num(p.bandCount, NaN)) return false;
        return near(st.value, num(p.target, NaN), num(p.tol, 0.001));
      },
    },
    toleranceEquals: {
      description: "แถบค่าผิดพลาดเท่ากับเปอร์เซ็นต์ที่กำหนด",
      params: "{ percent }",
      fn: (s, p) => {
        const st = asState(s);
        return !!st && Number.isFinite(st.tolerance) && Math.abs(st.tolerance - num(p.percent, NaN)) < 1e-9;
      },
    },
    quizStreak: {
      description: "ตอบแบบทดสอบถูกติดต่อกันอย่างน้อย min ข้อ",
      params: "{ min }",
      fn: (s, p) => {
        const st = asState(s);
        return !!st?.quiz && st.quiz.streak >= num(p.min, 1);
      },
    },
    quizCorrect: {
      description: "ตอบแบบทดสอบถูกรวมอย่างน้อย min ข้อ",
      params: "{ min }",
      fn: (s, p) => {
        const st = asState(s);
        return !!st?.quiz && st.quiz.correct >= num(p.min, 1);
      },
    },
    smdValue: {
      description: "ค่าที่ถอดจากรหัส SMD เท่ากับค่าเป้าหมาย",
      params: "{ target: Ω, tol?: relative [0.001] }",
      fn: (s, p) => {
        const st = asState(s);
        return !!st?.smd && near(st.smd.value, num(p.target, NaN), num(p.tol, 0.001));
      },
    },
  },
  Component: Lab,
  readouts: (s) => {
    const MODE: Record<string, string> = { read: "อ่านค่า", make: "ตั้งแถบตามเป้าหมาย", quiz: "แบบทดสอบ", smd: "รหัส SMD" };
    const rows = [{ label: "โหมด", value: MODE[s.mode] ?? s.mode }];
    if (s.mode === "smd") {
      rows.push({ label: "รหัส", value: s.smd?.code ?? "—" }, { label: "ค่า", value: s.smd ? formatSI(s.smd.value, "Ω") : "อ่านไม่ได้" });
      const KIND: Record<string, string> = { zero: "0 Ω (จัมเปอร์)", EIA96: "EIA-96 (±1 %)", "3digit": "3 หลัก (±5 %)", "4digit": "4 หลัก (±1 %)", R: "R แทนจุดทศนิยม", RKM: "รหัส RKM" };
      const d = s.smd ? decodeSmd(s.smd.code) : null;
      rows.push({ label: "รูปแบบ", value: d?.ok ? (KIND[d.kind] ?? d.kind) : "—" });
      return rows;
    }
    const names = (s.bands ?? []).map((b) => (isColour(b) ? COLOURS[b].th : b)).join("–");
    rows.push({ label: `แถบสี (${s.bandCount} แถบ)`, value: names || "—" });
    const ok = Number.isFinite(s.value);
    rows.push({ label: "ค่า", value: ok ? formatSI(s.value, "Ω") : "อ่านไม่ได้" });
    rows.push({ label: "ค่าผิดพลาด", value: Number.isFinite(s.tolerance) ? formatPercent(s.tolerance) : "—" });
    if (ok && Number.isFinite(s.tolerance))
      rows.push({ label: "ช่วงค่า", value: `${formatSI(s.value * (1 - s.tolerance / 100), "Ω")} – ${formatSI(s.value * (1 + s.tolerance / 100), "Ω")}` });
    if (s.tempco !== undefined) rows.push({ label: "TCR", value: `${s.tempco} ppm/K` });
    rows.push({ label: "ค่ามาตรฐาน", value: s.isStandard ? (s.series ?? "ใช่") : "ไม่ใช่ E12/E24/E96" });
    if (s.mode === "make" && s.target !== undefined) rows.push({ label: "เป้าหมาย", value: `${formatSI(s.target, "Ω")} — ${s.matched ? "ตรง" : "ยังไม่ตรง"}` });
    if (s.mode === "quiz" && s.quiz) rows.push({ label: "แบบทดสอบ", value: `ถูก ${s.quiz.correct}/${s.quiz.attempts} ติดต่อกัน ${s.quiz.streak}` });
    return rows;
  },
  previewStage,
};

export default lab;
