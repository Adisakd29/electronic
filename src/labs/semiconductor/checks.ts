import type { LabCheck } from "../types";
import type { SemiState } from "./model";

const ok = (s: unknown): s is SemiState =>
  !!s && typeof s === "object" && "diode" in s && "led" in s && "rect" in s && "bjt" in s;

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

export const checks: Record<string, LabCheck> = {
  diodeForward: {
    description: "ไดโอดได้รับไบแอสตรงและมีกระแส ID มากกว่า 0.1 mA",
    params: "{}",
    fn: (s) => ok(s) && s.diode.bias === "forward" && s.diode.Id > 1e-4,
  },
  diodeReverse: {
    description: "ไดโอดได้รับไบแอสกลับ",
    params: "{}",
    fn: (s) => ok(s) && s.diode.bias === "reverse",
  },
  ledCurrentInRange: {
    description: "กระแส LED อยู่ในช่วง [min, max] และ LED ทำงานปกติ",
    params: "{ min: A, max: A }",
    fn: (s, p) => {
      if (!ok(s)) return false;
      const min = num(p.min, 0);
      const max = num(p.max, Infinity);
      return s.led.status === "ok" && s.led.If >= min && s.led.If <= max;
    },
  },
  ledBurnt: {
    description: "LED เสียเพราะกระแสเกินพิกัด (เกิน 30 mA)",
    params: "{}",
    fn: (s) => ok(s) && s.led.status === "burnt",
  },
  rectifierType: {
    description: "เลือกวงจรเรียงกระแสชนิดที่กำหนด (half | center-tap | bridge)",
    params: "{ type: \"half\" | \"center-tap\" | \"bridge\" }",
    fn: (s, p) => ok(s) && s.rect.type === p.type,
  },
  rippleBelow: {
    description: "ใส่ตัวเก็บประจุกรองแล้ว และแรงดันริปเปิลไม่เกิน max",
    params: "{ max: V }",
    fn: (s, p) => ok(s) && s.rect.C > 0 && s.rect.ripple <= num(p.max, -Infinity),
  },
  bjtRegion: {
    description: "ทรานซิสเตอร์ทำงานในย่านที่กำหนด (cutoff | active | saturation)",
    params: "{ region: \"cutoff\" | \"active\" | \"saturation\" }",
    fn: (s, p) => ok(s) && s.bjt.region === p.region,
  },
};
