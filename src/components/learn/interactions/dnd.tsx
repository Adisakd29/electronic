"use client";
import { KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type Announcements } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export function useDndSensors(sortable = false) {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, sortable ? { coordinateGetter: sortableKeyboardCoordinates } : undefined),
  );
}

export const thaiScreenReaderInstructions = {
  draggable: "กด Space หรือ Enter เพื่อหยิบ ใช้ลูกศรเพื่อย้าย กด Space หรือ Enter อีกครั้งเพื่อวาง หรือกด Escape เพื่อยกเลิก หรือใช้ปุ่มเลือกแทนการลาก",
};

export function thaiAnnouncements(name: (id: string | number) => string): Announcements {
  return {
    onDragStart: ({ active }) => `หยิบ ${name(active.id)}`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} อยู่เหนือ ${name(over.id)}` : `${name(active.id)} ไม่ได้อยู่เหนือช่องใด`),
    onDragEnd: ({ active, over }) => (over ? `วาง ${name(active.id)} ที่ ${name(over.id)}` : `วาง ${name(active.id)}`),
    onDragCancel: ({ active }) => `ยกเลิกการย้าย ${name(active.id)}`,
  };
}

/** Plain text for screen-reader announcements from a Markdown string. */
export function plain(md: string, max = 60): string {
  const t = md.replace(/\$+([^$]*)\$+/g, "$1").replace(/[*_`#>\\]/g, "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
