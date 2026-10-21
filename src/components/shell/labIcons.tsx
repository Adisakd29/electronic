import { Activity, BatteryCharging, CircuitBoard, Cpu, Fan, Gauge, Magnet, Omega, Palette, ToggleRight, type LucideIcon } from "lucide-react";
import type { LabId } from "@/content/types";

export const labIcon: Record<LabId, LucideIcon> = {
  circuit: CircuitBoard,
  ohms: Omega,
  "color-code": Palette,
  capacitor: BatteryCharging,
  "inductor-transformer": Magnet,
  relay: ToggleRight,
  semiconductor: Cpu,
  motor: Fan,
  multimeter: Gauge,
  oscilloscope: Activity,
};
