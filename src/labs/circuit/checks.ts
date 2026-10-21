import { near, type LabCheck } from "../types";
import { distinctMeasurements, type CircuitState } from "./model";

type P = Record<string, number | string | boolean>;

const num = (v: unknown, d: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : d;
};
/** Relative tolerance; a target of exactly 0 gets a small absolute band (10 m-unit). */
const approx = (value: number, target: number, tol: number) => near(value, target, tol, target === 0 ? 0.01 : 0);
const idx = (p: P): number => {
  const i = Math.round(num(p.index, NaN));
  return i >= 1 && i <= 3 ? i - 1 : -1;
};
const ok = (s: unknown): s is CircuitState =>
  !!s && typeof s === "object" && Array.isArray((s as CircuitState).VR) && typeof (s as CircuitState).I === "number";

export const checks: Record<string, LabCheck<CircuitState>> = {
  topology: {
    description: "รูปแบบวงจรตรงกับที่กำหนด (single / series / parallel / mixed)",
    params: "{ is: \"single\" | \"series\" | \"parallel\" | \"mixed\" }",
    fn: (s, p) => ok(s) && s.topology === String(p.is),
  },
  totalCurrent: {
    description: "สวิตช์ปิดวงจร (ON) และกระแสรวม I ใกล้ค่าเป้าหมาย",
    params: "{ target: A, tol?: relative [0.03] }",
    fn: (s, p) => ok(s) && s.switchClosed && approx(s.I, num(p.target, NaN), num(p.tol, 0.03)),
  },
  req: {
    description: "ความต้านทานรวม R_eq ใกล้ค่าเป้าหมาย",
    params: "{ target: Ω, tol?: relative [0.03] }",
    fn: (s, p) => ok(s) && approx(s.Req, num(p.target, NaN), num(p.tol, 0.03)),
  },
  voltageAcross: {
    description: "แรงดันตกคร่อม R ตัวที่ index ใกล้ค่าเป้าหมาย",
    params: "{ index: 1–3, target: V, tol?: relative [0.03] }",
    fn: (s, p) => {
      const i = idx(p);
      return ok(s) && i >= 0 && approx(s.VR[i], num(p.target, NaN), num(p.tol, 0.03));
    },
  },
  branchCurrent: {
    description: "กระแสผ่าน R ตัวที่ index ใกล้ค่าเป้าหมาย",
    params: "{ index: 1–3, target: A, tol?: relative [0.03] }",
    fn: (s, p) => {
      const i = idx(p);
      return ok(s) && i >= 0 && approx(s.IR[i], num(p.target, NaN), num(p.tol, 0.03));
    },
  },
  powerBelow: {
    description: "กำลังไฟฟ้าใน R ตัวที่ index ไม่เกินค่าที่กำหนด",
    params: "{ index: 1–3, max: W }",
    fn: (s, p) => {
      const i = idx(p);
      const max = num(p.max, NaN);
      return ok(s) && i >= 0 && Number.isFinite(max) && s.PR[i] <= max;
    },
  },
  switchOpenNoCurrent: {
    description: "สวิตช์เปิดวงจร (OFF) และไม่มีกระแสไหล (I = 0)",
    params: "{}",
    fn: (s) => ok(s) && s.switchClosed === false && s.I === 0,
  },
  faultCleared: {
    description: "ไม่มีจุดบกพร่องเหลืออยู่ (ซ่อมด้วยปุ่ม \"ซ่อม\" หลังระบุจุดได้ถูกต้อง)",
    params: "{}",
    fn: (s) => ok(s) && s.fault === "none",
  },
  faultDiagnosed: {
    description: "วินิจฉัยจุดบกพร่องถูกต้อง (ชนิด + ตัวที่เสีย) หลังจากวัดค่าต่างกันอย่างน้อย minMeasurements จุด",
    params: "{ minMeasurements?: number [2] }",
    fn: (s, p) => ok(s) && !!s.diagnosis && s.diagnosis.correct && s.diagnosis.measurementsBefore >= num(p.minMeasurements, 2),
  },
  measured: {
    description: "บันทึกการวัดที่ต่างกัน (คู่จุดวัดแรงดัน / แอมมิเตอร์) อย่างน้อย min ครั้งในโหมดหาจุดบกพร่อง",
    params: "{ min: number }",
    fn: (s, p) => ok(s) && Array.isArray(s.measurements) && distinctMeasurements(s.measurements) >= num(p.min, 1),
  },
};
