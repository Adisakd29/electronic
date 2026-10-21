import { createElement } from "react";
import { near, type LabModule } from "../types";
import Lab from "./Lab";
import { ASSUMPTIONS } from "./assumptions";
import { presetInputs, solve, type RelayState } from "./model";
import { formatSI } from "../shared/format";
import { RelayStage } from "./Stage";

export const lab: LabModule<RelayState> = {
  id: "relay",
  title: "ห้องทดลองรีเลย์",
  titleEn: "Relay Simulator",
  description: "ควบคุมคอยล์รีเลย์แล้วสังเกตหน้าสัมผัส COM/NO/NC วงจรขับด้วยทรานซิสเตอร์ ไดโอดป้องกันแรงดันกระชาก และวงจรล็อกตัวเอง",
  assumptions: ASSUMPTIONS,
  presets: {
    default: { label: "พื้นฐาน 12 V / 400 Ω", description: "แหล่งจ่าย 12 V สวิตช์ S1 ควบคุมคอยล์ 400 Ω (30 mA) หน้าสัมผัส SPDT ขับหลอด NO และ NC" },
    driver: { label: "ขับด้วยทรานซิสเตอร์", description: "Vin 5 V ผ่าน R_B 1 kΩ เข้าเบส NPN (β = 100) ขับคอยล์ด้านล่าง (low-side)" },
    latch: { label: "วงจรล็อกตัวเอง", description: "ปุ่ม START (NO) ขนานกับหน้าสัมผัสค้าง 21–24 ต่ออนุกรมกับ STOP (NC) และ OL 95–96" },
    undervoltage: { label: "แรงดันต่ำ / ฮิสเทรีซิส", description: "เริ่มที่ 0 V สวิตช์ปิดวงจรแล้ว ค่อย ๆ เพิ่ม–ลดแรงดันเพื่อหาแรงดันดึงเข้าและปล่อย" },
  },
  checks: {
    lampOn: {
      description: "หลอดที่ระบุติด",
      params: '{ which: "NO" | "NC" }',
      fn: (s, p) => (String(p.which).toUpperCase() === "NC" ? s.lampNC : s.lampNO),
    },
    energized: {
      description: "สถานะคอยล์ทำงานตรงตามที่กำหนด",
      params: "{ value: boolean }",
      fn: (s, p) => s.energized === (p.value === undefined ? true : p.value === true || p.value === "true"),
    },
    latched: {
      description: "โหมดล็อกตัวเอง และรีเลย์ค้างอยู่หลังปล่อยปุ่ม START",
      params: "{}",
      fn: (s) => s.mode === "latch" && s.latched,
    },
    flybackEnabled: { description: "ต่อไดโอดป้องกัน (flyback) แล้ว", params: "{}", fn: (s) => s.flyback === true },
    transistorSaturated: { description: "ทรานซิสเตอร์ขับรีเลย์อยู่ในสภาวะอิ่มตัว", params: "{}", fn: (s) => s.driver?.saturated === true },
    coilCurrentEquals: {
      description: "กระแสคอยล์เท่ากับค่าเป้าหมาย",
      params: "{ target: A, tol?: relative (0.03) }",
      fn: (s, p) => near(s.coilI, Number(p.target), p.tol === undefined ? 0.03 : Number(p.tol), 1e-6),
    },
  },
  Component: Lab,
  readouts: (s) => {
    const MODE: Record<string, string> = { basic: "พื้นฐาน", driver: "ขับด้วยทรานซิสเตอร์", latch: "ล็อกตัวเอง" };
    const rows = [
      { label: "โหมด", value: MODE[s.mode] ?? s.mode },
      { label: "แหล่งจ่าย", value: formatSI(s.supplyV, "V") },
      { label: "R คอยล์", value: formatSI(s.coilR, "Ω") },
      { label: "V คอยล์", value: formatSI(s.coilV, "V") },
      { label: "I คอยล์", value: formatSI(s.coilI, "A") },
      { label: "คอยล์", value: s.energized ? "ทำงาน (ดึงเข้า)" : "ไม่ทำงาน" },
      { label: "หลอด NO / NC", value: `${s.lampNO ? "ติด" : "ดับ"} / ${s.lampNC ? "ติด" : "ดับ"}` },
      { label: "ไดโอด flyback", value: s.flyback ? "มี" : `ไม่มี${s.lastSpikeV > 0 ? ` (กระชาก ≈ ${formatSI(s.lastSpikeV, "V")})` : ""}` },
    ];
    if (s.mode === "latch") rows.push({ label: "ล็อกค้าง", value: s.latched ? "ใช่" : "ไม่" });
    if (s.driver) rows.push({ label: "ทรานซิสเตอร์", value: `I_B ${formatSI(s.driver.Ib, "A")} — ${s.driver.saturated ? "อิ่มตัว" : "ไม่อิ่มตัว"}` });
    return rows;
  },
  previewStage: (preset) => {
    const inp = presetInputs(preset);
    return createElement(RelayStage, { s: solve(inp), inp, animate: false });
  },
};

export default lab;
