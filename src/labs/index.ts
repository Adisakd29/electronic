import type { LabId } from "@/content/types";
import type { LabModule } from "./types";

/** Lazy lab modules (client side). */
export const labLoaders: Record<LabId, () => Promise<{ lab: LabModule }>> = {
  circuit: () => import("./circuit"),
  ohms: () => import("./ohms"),
  "color-code": () => import("./color-code"),
  capacitor: () => import("./capacitor"),
  "inductor-transformer": () => import("./inductor-transformer"),
  relay: () => import("./relay"),
  semiconductor: () => import("./semiconductor"),
  motor: () => import("./motor"),
  multimeter: () => import("./multimeter"),
  oscilloscope: () => import("./oscilloscope"),
};

export const labIds = Object.keys(labLoaders) as LabId[];

export const labCatalog: Record<LabId, { title: string; titleEn: string; weeks: number[]; summary: string }> = {
  circuit: { title: "ห้องทดลองวงจรไฟฟ้ากระแสตรง", titleEn: "DC Circuit Simulator", weeks: [4, 5, 6, 15], summary: "ต่อวงจรอนุกรม ขนาน ผสม เปลี่ยนค่า R และ V แล้วดูกระแสและแรงดันทุกจุด พร้อมโหมดหาจุดบกพร่อง" },
  ohms: { title: "ห้องทดลองกฎของโอห์ม", titleEn: "Ohm's Law Laboratory", weeks: [1, 2, 3], summary: "ปรับ V และ R สังเกตกระแส บันทึกจุดลงกราฟ V–I และสำรวจกระแสผ่านร่างกาย" },
  "color-code": { title: "ฝึกอ่านแถบสีตัวต้านทาน", titleEn: "Resistor Colour Code", weeks: [7], summary: "อ่านและตั้งแถบสี 4–6 แถบ ค่าความคลาดเคลื่อน ค่ามาตรฐาน E-series และรหัส SMD" },
  capacitor: { title: "การประจุ–คายประจุตัวเก็บประจุ", titleEn: "Capacitor RC Simulator", weeks: [8], summary: "ดูกราฟแรงดันขณะประจุและคายประจุ หาค่าคงที่เวลา τ = RC และต่อตัวเก็บประจุหลายตัว" },
  "inductor-transformer": { title: "ตัวเหนี่ยวนำและหม้อแปลง", titleEn: "Inductor & Transformer", weeks: [9, 10], summary: "สำรวจสนามแม่เหล็กของขดลวด ค่าความเหนี่ยวนำ X_L และอัตราส่วนแรงดัน–กระแสของหม้อแปลง" },
  relay: { title: "ห้องทดลองรีเลย์", titleEn: "Relay Simulator", weeks: [11, 13, 16], summary: "ควบคุมหน้าสัมผัส NO/NC วงจรขับด้วยทรานซิสเตอร์ ไดโอดป้องกัน และวงจรล็อกตัวเอง" },
  semiconductor: { title: "ห้องทดลองสารกึ่งตัวนำ", titleEn: "Semiconductor Laboratory", weeks: [13], summary: "ไดโอด LED วงจรเรียงกระแสพร้อมตัวกรอง และทรานซิสเตอร์ทำงานเป็นสวิตช์" },
  motor: { title: "การควบคุมมอเตอร์กระแสตรง", titleEn: "DC Motor Control", weeks: [16], summary: "ปรับความเร็วด้วย PWM กลับทิศด้วย H-bridge และวงจรสตาร์ต–สต็อปด้วยคอนแทกเตอร์" },
  multimeter: { title: "มัลติมิเตอร์เสมือน", titleEn: "Virtual Multimeter", weeks: [4, 14, 17], summary: "เลือกย่านและช่องเสียบให้ถูก วัดแรงดัน กระแส ความต้านทาน ไดโอด และความต่อเนื่อง" },
  oscilloscope: { title: "ออสซิลโลสโคปเสมือน", titleEn: "Virtual Oscilloscope", weeks: [12, 18], summary: "ปรับ VOLTS/DIV TIME/DIV และทริกเกอร์ อ่านค่า Vpp คาบ และความถี่จากหน้าจอ" },
};
