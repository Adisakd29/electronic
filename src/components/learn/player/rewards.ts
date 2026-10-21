"use client";
import { toast } from "sonner";

/** XP / achievement toasts from action results. */
export function toastRewards(r: { xpAwarded?: number; newAchievements?: string[] } | null | undefined) {
  if (!r) return;
  if (r.xpAwarded && r.xpAwarded > 0) toast.success(`ได้รับ ${r.xpAwarded} XP`, { duration: 2500 });
  for (const a of r.newAchievements ?? []) toast.success(`ปลดล็อกความสำเร็จ: ${a}`, { duration: 6000 });
}

export function toastError(message: string) {
  toast.error(message, { duration: 6000 });
}

export function toastInfo(message: string) {
  toast(message, { duration: 5000 });
}
