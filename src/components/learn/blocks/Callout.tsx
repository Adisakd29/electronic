import {
  BadgeCheck,
  Brain,
  Info,
  Lightbulb,
  OctagonAlert,
  ShieldAlert,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import type { CalloutVariant } from "@/content/types";
import { cn } from "@/lib/cn";
import { Markdown } from "../Markdown";

const meta: Record<CalloutVariant, { title: string; icon: typeof Info; cls: string; iconCls: string }> = {
  info: { title: "ข้อมูลเพิ่มเติม", icon: Info, cls: "border-info/40 bg-info-soft/70", iconCls: "text-info" },
  tip: { title: "เคล็ดลับ", icon: Lightbulb, cls: "border-ok/40 bg-ok-soft/70", iconCls: "text-ok" },
  warning: { title: "ข้อควรระวัง", icon: TriangleAlert, cls: "border-warn/50 bg-warn-soft/80", iconCls: "text-warn" },
  danger: { title: "อันตราย", icon: OctagonAlert, cls: "ee-callout-danger border-danger bg-danger-soft", iconCls: "text-danger" },
  safety: { title: "กฎความปลอดภัย", icon: ShieldAlert, cls: "ee-callout-safety", iconCls: "text-ink" },
  standard: { title: "มาตรฐานที่เกี่ยวข้อง", icon: BadgeCheck, cls: "ee-callout-standard border-line-strong bg-panel", iconCls: "text-ink-2" },
  misconception: { title: "ความเข้าใจผิดที่พบบ่อย", icon: Brain, cls: "border-copper/40 bg-copper-soft/70", iconCls: "text-copper" },
  realworld: { title: "การใช้งานจริง", icon: Wrench, cls: "border-cobalt/35 bg-cobalt-soft/60", iconCls: "text-cobalt-ink" },
};

export function Callout({ variant, title, md }: { variant: CalloutVariant; title?: string; md: string }) {
  const m = meta[variant] ?? meta.info;
  const Icon = m.icon;
  return (
    <aside
      aria-label={title ?? m.title}
      className={cn("ee-callout my-5 max-w-[72ch] rounded-md border px-4 py-3 break-inside-avoid", m.cls)}
      data-variant={variant}
    >
      <p className="mb-1 flex items-start gap-2 font-semibold text-ink">
        <Icon className={cn("mt-1 size-5 shrink-0", m.iconCls)} aria-hidden />
        <span>
          {title ? (
            <>
              <span className="sr-only">{m.title}: </span>
              {title}
            </>
          ) : (
            m.title
          )}
        </span>
      </p>
      <Markdown className="pl-7 text-ink-2 [&_p:last-child]:mb-0">{md}</Markdown>
    </aside>
  );
}
