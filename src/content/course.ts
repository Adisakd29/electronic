import type { Category, LabId, TrackId } from "./types";

/**
 * Course-level metadata (from the official plan, with the corrections listed in
 * docs/curriculum/CURRICULUM_REPORT.md — e.g. the duplicated phrase in the
 * course description was removed).
 */
export const course = {
  code: "20100-1005",
  name: "งานไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น",
  nameEn: "Basic Electrical and Electronics Work",
  level: "ประกาศนียบัตรวิชาชีพ (ปวช.)",
  credits: { theory: 1, practice: 3, credits: 2 },
  weeks: 18,
  hoursPerWeek: 4,
  standardRef: "มาตรฐานฝีมือแรงงานแห่งชาติ กรมพัฒนาฝีมือแรงงาน อาชีพช่างอิเล็กทรอนิกส์ ระดับ 1",
  outcome:
    "วัด ทดสอบ ประกอบวงจรไฟฟ้าและอิเล็กทรอนิกส์ ตรวจสอบอุปกรณ์อิเล็กทรอนิกส์ ต่อวงจร ประกอบและตรวจสอบวงจรไฟฟ้าเบื้องต้น ใช้เครื่องมือวัดทดสอบวงจรไฟฟ้าและวงจรอิเล็กทรอนิกส์ตามหลักการความปลอดภัย",
  objectives: [
    "รู้และเข้าใจเกี่ยวกับระบบความปลอดภัย หลักการทำงาน การวัดและทดสอบงานไฟฟ้าและอิเล็กทรอนิกส์",
    "มีทักษะการใช้เครื่องมือวัด ทดสอบวงจรไฟฟ้าและอิเล็กทรอนิกส์ การเตรียมอุปกรณ์ ประกอบและทดสอบวงจร และเลือกใช้เครื่องใช้ไฟฟ้าและอิเล็กทรอนิกส์",
    "มีเจตคติที่ดีต่องานอาชีพ มีความคิดริเริ่มสร้างสรรค์ ซื่อสัตย์สุจริต มีระเบียบวินัย และรับผิดชอบต่องานอาชีพ",
    "วิเคราะห์ วินิจฉัยปัญหาเบื้องต้น ตัดสินใจ รู้ขั้นตอนของงาน ใช้คู่มือ และเลือกวิธีการที่เหมาะสมในการปฏิบัติงาน",
  ],
  competencies: [
    { no: 1, text: "แสดงความรู้เกี่ยวกับหลักการวัด ทดสอบ ประกอบวงจรไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้นและความปลอดภัย" },
    { no: 2, text: "ประกอบและตรวจสอบวงจรไฟฟ้าเบื้องต้น" },
    { no: 3, text: "ต่อวงจรและตรวจสอบอุปกรณ์อิเล็กทรอนิกส์เบื้องต้น" },
    { no: 4, text: "ใช้เครื่องมือวัดทดสอบวงจรไฟฟ้าและวงจรอิเล็กทรอนิกส์" },
  ],
  description:
    "ศึกษาและปฏิบัติงานเกี่ยวกับหลักการของทฤษฎีไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น มาตรการความปลอดภัยในการปฏิบัติงานไฟฟ้าและอิเล็กทรอนิกส์ พลังงานไฟฟ้า วงจรไฟฟ้า การควบคุมมอเตอร์เบื้องต้น อุปกรณ์ป้องกันไฟฟ้าและการต่อสายดิน หม้อแปลงไฟฟ้า รีเลย์ ไมโครโฟน ลำโพง สัญลักษณ์ คุณสมบัติ และวงจรใช้งานของวัสดุอุปกรณ์อิเล็กทรอนิกส์ ได้แก่ ตัวต้านทาน ตัวเก็บประจุ ตัวเหนี่ยวนำ ไดโอด ทรานซิสเตอร์ เอสซีอาร์ แหล่งจ่ายไฟฟ้า การใช้มัลติมิเตอร์ เครื่องกำเนิดสัญญาณ ออสซิลโลสโคป การประกอบ วัด ทดสอบ และตรวจสอบวงจรไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น",
} as const;

export interface WeekMeta {
  week: number;
  title: string;
  titleEn: string;
  category: Category;
  unit: number;
  lab: LabId | null;
  /** short phrase for roadmap tooltips */
  focus: string;
}

export const weekMeta: WeekMeta[] = [
  { week: 1, title: "ระบบความปลอดภัยในการทำงานไฟฟ้าและอิเล็กทรอนิกส์", titleEn: "Electrical & Electronic Work Safety", category: "safety", unit: 1, lab: "ohms", focus: "อันตรายจากไฟฟ้า อุปกรณ์ป้องกัน กฎโรงฝึกงาน" },
  { week: 2, title: "การป้องกันอุบัติเหตุทางไฟฟ้าและการรับมือเหตุฉุกเฉิน", titleEn: "Accident Prevention & Emergency Response", category: "safety", unit: 1, lab: "ohms", focus: "LOTO ช่วยเหลือผู้ถูกไฟดูด CPR/AED อัคคีภัย" },
  { week: 3, title: "ความรู้เบื้องต้นเกี่ยวกับไฟฟ้าและวงจรไฟฟ้า", titleEn: "Fundamentals of Electricity & Circuits", category: "circuits", unit: 2, lab: "ohms", focus: "ประจุ แรงดัน กระแส ความต้านทาน กฎของโอห์ม กำลังไฟฟ้า" },
  { week: 4, title: "วงจรไฟฟ้าและการวัดค่าปริมาณทางไฟฟ้าเบื้องต้น", titleEn: "Circuits & Basic Electrical Measurement", category: "circuits", unit: 3, lab: "circuit", focus: "อนุกรม ขนาน ผสม KVL KCL ใช้มัลติมิเตอร์วัด V I R (บทเรียนหลัก)" },
  { week: 5, title: "วงจรไฟฟ้าแสงสว่าง", titleEn: "Lighting Circuits", category: "circuits", unit: 4, lab: "circuit", focus: "สวิตช์ทางเดียว สองทาง หลอดไฟ การเดินสาย" },
  { week: 6, title: "อุปกรณ์ป้องกันไฟฟ้า", titleEn: "Electrical Protective Devices", category: "protection", unit: 5, lab: "circuit", focus: "ฟิวส์ MCB RCD สายดิน TN-C-S" },
  { week: 7, title: "ตัวต้านทาน (Resistor)", titleEn: "Resistors", category: "passive", unit: 6, lab: "color-code", focus: "ชนิด รหัสสี E-series อนุกรม ขนาน ผสม" },
  { week: 8, title: "ตัวเก็บประจุ (Capacitor)", titleEn: "Capacitors", category: "passive", unit: 7, lab: "capacitor", focus: "ความจุ รหัส การประจุ–คายประจุ τ = RC" },
  { week: 9, title: "ตัวเหนี่ยวนำ (Inductor)", titleEn: "Inductors", category: "passive", unit: 8, lab: "inductor-transformer", focus: "สนามแม่เหล็ก ความเหนี่ยวนำ X_L การต่อ" },
  { week: 10, title: "หม้อแปลงไฟฟ้า (Transformer)", titleEn: "Transformers", category: "magnetic", unit: 9, lab: "inductor-transformer", focus: "อัตราส่วนรอบ กำลัง ขั้วหม้อแปลง" },
  { week: 11, title: "รีเลย์ (Relay)", titleEn: "Relays", category: "magnetic", unit: 10, lab: "relay", focus: "NO NC COM คอยล์ วงจรขับ การตรวจสอบ" },
  { week: 12, title: "ไมโครโฟนและลำโพง", titleEn: "Microphones & Loudspeakers", category: "magnetic", unit: 11, lab: "oscilloscope", focus: "ทรานสดิวเซอร์เสียง อิมพีแดนซ์ การต่อลำโพง" },
  { week: 13, title: "อุปกรณ์สารกึ่งตัวนำ", titleEn: "Semiconductor Devices", category: "semiconductor", unit: 12, lab: "semiconductor", focus: "ไดโอด LED วงจรเรียงกระแส ทรานซิสเตอร์ SCR" },
  { week: 14, title: "เทคนิคการบัดกรีและการประกอบวงจรอิเล็กทรอนิกส์ ตอนที่ 1", titleEn: "Soldering & Circuit Assembly, Part 1", category: "assembly", unit: 13, lab: "multimeter", focus: "เครื่องมือ ตะกั่วบัดกรี จุดบัดกรีที่ดี แผ่นวงจรพิมพ์" },
  { week: 15, title: "การประกอบ ตรวจสอบ และแก้ไขข้อบกพร่องของวงจร ตอนที่ 2", titleEn: "Assembly, Inspection & Troubleshooting, Part 2", category: "assembly", unit: 13, lab: "circuit", focus: "ประกอบชุดคิต ตรวจสอบ หาจุดบกพร่อง" },
  { week: 16, title: "การควบคุมมอเตอร์เบื้องต้น", titleEn: "Basic Motor Control", category: "motor", unit: 14, lab: "motor", focus: "มอเตอร์ DC แม่เหล็กถาวร PWM H-bridge วงจรสตาร์ต–สต็อป" },
  { week: 17, title: "เครื่องมือวัดและทดสอบทางไฟฟ้า ตอนที่ 1: มัลติมิเตอร์ แหล่งจ่ายไฟตรง และการตรวจวัด วิเคราะห์ และแก้ไขวงจร", titleEn: "Test Instruments, Part 1: Multimeters, DC Supply & Measurement-Based Circuit Repair", category: "instrument", unit: 15, lab: "multimeter", focus: "มัลติมิเตอร์เชิงลึก CAT แหล่งจ่ายไฟ วัดเพื่อหาจุดเสียและซ่อม" },
  { week: 18, title: "บูรณาการและประเมินสมรรถนะปลายภาค: ออสซิลโลสโคปและเครื่องกำเนิดสัญญาณ (เครื่องมือวัดและทดสอบ ตอนที่ 2)", titleEn: "Integration & Final Competency Assessment (Test Instruments, Part 2: Oscilloscope)", category: "instrument", unit: 15, lab: "oscilloscope", focus: "ออสซิลโลสโคป เครื่องกำเนิดสัญญาณ สัปดาห์บูรณาการ ประเมินปลายภาค 4 สถานี" },
];

export const categoryInfo: Record<Category, { label: string; cssVar: string }> = {
  safety: { label: "ความปลอดภัย", cssVar: "--cat-safety" },
  circuits: { label: "วงจรไฟฟ้า", cssVar: "--cat-circuits" },
  protection: { label: "การป้องกัน", cssVar: "--cat-protection" },
  passive: { label: "อุปกรณ์พาสซีฟ", cssVar: "--cat-passive" },
  magnetic: { label: "อุปกรณ์แม่เหล็กไฟฟ้า", cssVar: "--cat-magnetic" },
  semiconductor: { label: "สารกึ่งตัวนำ", cssVar: "--cat-semiconductor" },
  assembly: { label: "การประกอบวงจร", cssVar: "--cat-assembly" },
  motor: { label: "มอเตอร์", cssVar: "--cat-motor" },
  instrument: { label: "เครื่องมือวัด", cssVar: "--cat-instrument" },
};

export const stages = [
  { key: "intro", label: "บทนำ", labelEn: "Introduction" },
  { key: "learn", label: "เรียนรู้", labelEn: "Learn" },
  { key: "practice", label: "ฝึกปฏิบัติเชิงโต้ตอบ", labelEn: "Interactive Practice" },
  { key: "lab", label: "ห้องทดลองเสมือน", labelEn: "Virtual Lab" },
  { key: "quiz", label: "แบบทดสอบ", labelEn: "Weekly Quiz" },
  { key: "complete", label: "สรุปและจบบท", labelEn: "Complete" },
] as const;

export type StageKey = (typeof stages)[number]["key"];

/** Trades that take this common subject. Order = order in the picker. */
export const tracks: { id: TrackId; label: string; short: string; examples: string }[] = [
  { id: "auto", label: "ช่างยนต์ / ช่างจักรยานยนต์", short: "ช่างยนต์", examples: "ระบบไฟรถยนต์ 12 V แบตเตอรี่ ไดชาร์จ ฟิวส์ รีเลย์แตร ไฟหน้า เซนเซอร์" },
  { id: "mech", label: "ช่างกลโรงงาน / ช่างเชื่อม / ช่างซ่อมบำรุง", short: "ช่างกล/เชื่อม", examples: "มอเตอร์เครื่องจักร ตู้เชื่อม สวิตช์ฉุกเฉิน แผงควบคุม เซนเซอร์ในโรงงาน" },
  { id: "build", label: "ช่างก่อสร้าง / ช่างโยธา / ช่างสถาปัตยกรรม", short: "ช่างก่อสร้าง", examples: "ไฟในอาคาร เบรกเกอร์ สายดิน ไฟชั่วคราวในไซต์งาน เครื่องมือไฟฟ้า" },
  { id: "power", label: "ช่างไฟฟ้ากำลัง", short: "ช่างไฟฟ้ากำลัง", examples: "เดินสายไฟอาคาร ตู้ควบคุม มอเตอร์ หม้อแปลง แมกเนติกคอนแทกเตอร์" },
  { id: "hvac", label: "ช่างเครื่องทำความเย็นและปรับอากาศ", short: "ช่างแอร์/เครื่องเย็น", examples: "คอมเพรสเซอร์ คาปาซิเตอร์สตาร์ต/รัน รีเลย์ เทอร์โมสตัท พัดลมคอยล์ร้อน" },
  { id: "comp", label: "ช่างเทคนิคคอมพิวเตอร์", short: "ช่างคอมพิวเตอร์", examples: "พาวเวอร์ซัพพลาย อะแดปเตอร์ USB UPS เมนบอร์ด เซนเซอร์และไมโครคอนโทรลเลอร์" },
];

export const TRACK_IDS = tracks.map((t) => t.id);
export const isTrackId = (v: unknown): v is TrackId => typeof v === "string" && (TRACK_IDS as string[]).includes(v);
