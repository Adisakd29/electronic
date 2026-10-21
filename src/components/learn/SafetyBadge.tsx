/** Safety level badge S0–S3 with Thai meaning (server-safe). */
import { ShieldAlert, ShieldCheck, ShieldHalf, TriangleAlert } from "lucide-react";
import type { PracticeActivity, SafetyLevel } from "@/content/types";
import { cn } from "@/lib/cn";

export const safetyInfo: Record<SafetyLevel, { short: string; meaning: string; supervised: boolean }> = {
  S0: { short: "นักเรียนทำได้เอง", meaning: "ไม่มีแหล่งจ่าย หรือแรงดันไม่เกิน 12 V DC แบบจำกัดกระแส", supervised: false },
  S1: { short: "ครูตรวจก่อนจ่ายไฟ", meaning: "นักเรียนทำเอง แรงดันไม่เกิน 24 V ครูตรวจวงจรก่อนจ่ายไฟทุกครั้ง", supervised: false },
  S2: { short: "ครูควบคุมใกล้ชิด", meaning: "งานที่มีความร้อน สารเคมี หรือเครื่องใช้ไฟฟ้าแรงดันสูงแบบปิดมิดชิด", supervised: true },
  S3: { short: "ครูสาธิตเท่านั้น", meaning: "มีจุดไฟฟ้า 230/400 V เปิดโล่ง นักเรียนสังเกตการณ์ ห้ามลงมือเอง", supervised: true },
};

export const activityTypeText: Record<PracticeActivity["type"], string> = {
  worksheet: "ใบงาน",
  bench: "งานปฏิบัติบนโต๊ะ",
  project: "โครงงาน",
  demo: "การสาธิต",
  fieldwork: "งานภาคสนาม",
};

export function SafetyBadge({ level, detailed = false, className }: { level: SafetyLevel; detailed?: boolean; className?: string }) {
  const s = safetyInfo[level];
  const Icon = level === "S0" ? ShieldCheck : level === "S1" ? ShieldHalf : level === "S2" ? ShieldAlert : TriangleAlert;
  const tone =
    level === "S0"
      ? "border-ok/40 bg-ok-soft text-ok"
      : level === "S1"
        ? "border-info/40 bg-info-soft text-info"
        : level === "S2"
          ? "border-warn/50 bg-warn-soft text-warn"
          : "border-danger/50 bg-danger-soft text-danger";
  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[0.85rem] font-semibold", tone)}>
        <Icon className="size-4" aria-hidden />
        <span>
          ความปลอดภัยระดับ {level}: {s.short}
        </span>
      </span>
      {detailed ? <span className="text-[0.88rem] text-ink-3">{s.meaning}</span> : null}
      {s.supervised ? (
        <span className="inline-flex items-center gap-1 text-[0.9rem] font-semibold text-danger">
          <TriangleAlert className="size-4" aria-hidden />
          ต้องอยู่ภายใต้การควบคุมของครู
        </span>
      ) : null}
    </span>
  );
}
