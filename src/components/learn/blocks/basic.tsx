/** Static block renderers (no hooks; usable from server or client). */
import { Check, Minus, X } from "lucide-react";
import type { VocabEntry } from "@/content/types";
import { cn } from "@/lib/cn";
import { Markdown, Tex } from "../Markdown";

export function FormulaBlock({
  tex,
  label,
  vars,
  note,
}: {
  tex: string;
  label?: string;
  vars?: { sym: string; th: string; unit?: string }[];
  note?: string;
}) {
  return (
    <div className="ee-formula my-6 max-w-[72ch] overflow-hidden rounded-md border border-line bg-panel break-inside-avoid">
      {label ? <p className="border-b border-line bg-panel-2 px-4 py-2 font-semibold text-ink">{label}</p> : null}
      <div className="px-4 py-3 text-[1.15rem]">
        <Tex tex={tex} display />
      </div>
      {vars && vars.length ? (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-[0.95rem]">
            <caption className="sr-only">ความหมายของตัวแปรในสูตร</caption>
            <thead>
              <tr className="text-left text-ink-3">
                <th scope="col" className="px-4 py-1.5 font-medium">
                  สัญลักษณ์
                </th>
                <th scope="col" className="px-2 py-1.5 font-medium">
                  ความหมาย
                </th>
                <th scope="col" className="px-4 py-1.5 font-medium">
                  หน่วย
                </th>
              </tr>
            </thead>
            <tbody>
              {vars.map((v, i) => (
                <tr key={i} className="border-t border-line/70">
                  <td className="px-4 py-1.5">
                    <Tex tex={v.sym} />
                  </td>
                  <td className="px-2 py-1.5 text-ink-2">{v.th}</td>
                  <td className="px-4 py-1.5 text-ink-2">{v.unit ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {note ? (
        <div className="border-t border-line px-4 py-2.5 text-[0.95rem]">
          <Markdown className="text-ink-2 [&_p:last-child]:mb-0">{note}</Markdown>
        </div>
      ) : null}
    </div>
  );
}

export function TableBlock({ caption, headers, rows, note }: { caption?: string; headers: string[]; rows: string[][]; note?: string }) {
  return (
    <div className="my-6 break-inside-avoid">
      {caption ? <p className="mb-2 font-semibold text-ink">{caption}</p> : null}
      <div className="overflow-x-auto rounded-md border border-line bg-panel">
        <table className="w-full min-w-[520px] border-collapse text-[0.95rem]">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} scope="col" className="border-b border-line-strong bg-panel-2 px-3 py-2 text-left align-bottom font-semibold text-ink">
                  <Markdown inline>{h}</Markdown>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line last:border-b-0 even:bg-panel-2/40">
                {r.map((c, j) =>
                  j === 0 ? (
                    <th key={j} scope="row" className="px-3 py-2 text-left align-top font-medium text-ink">
                      <Markdown inline>{c}</Markdown>
                    </th>
                  ) : (
                    <td key={j} className="px-3 py-2 align-top text-ink-2">
                      <Markdown inline>{c}</Markdown>
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <Markdown className="mt-2 text-[0.95rem] text-ink-3">{note}</Markdown> : null}
    </div>
  );
}

export function ProcedureBlock({ title, items }: { title?: string; items: string[] }) {
  return (
    <div className="my-6 max-w-[72ch] break-inside-avoid">
      {title ? <p className="mb-3 font-semibold text-ink">{title}</p> : null}
      <ol className="ee-procedure relative space-y-3">
        {items.map((md, i) => (
          <li key={i} className="relative flex gap-3">
            <span
              aria-hidden
              className="readout relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 border-copper bg-panel text-[0.9rem] font-semibold text-copper"
            >
              {i + 1}
            </span>
            <span className="sr-only">ขั้นที่ {i + 1}: </span>
            <Markdown className="min-w-0 flex-1 pt-0.5 [&_p:last-child]:mb-0">{md}</Markdown>
          </li>
        ))}
      </ol>
    </div>
  );
}

const toneMeta = {
  good: { icon: Check, label: "ควรทำ / ถูกต้อง", cls: "border-ok/50", head: "bg-ok-soft text-ok", iconCls: "text-ok" },
  bad: { icon: X, label: "ไม่ควรทำ / ผิด", cls: "border-danger/50", head: "bg-danger-soft text-danger", iconCls: "text-danger" },
  neutral: { icon: Minus, label: "", cls: "border-line", head: "bg-panel-2 text-ink", iconCls: "text-ink-3" },
} as const;

export function CompareBlock({ title, columns }: { title?: string; columns: { title: string; tone?: "good" | "bad" | "neutral"; points: string[] }[] }) {
  return (
    <div className="my-6 break-inside-avoid">
      {title ? <p className="mb-3 font-semibold text-ink">{title}</p> : null}
      <div className={cn("grid gap-3", columns.length === 2 ? "sm:grid-cols-2" : columns.length >= 3 ? "md:grid-cols-3" : "")}>
        {columns.map((c, i) => {
          const t = toneMeta[c.tone ?? "neutral"];
          const Icon = t.icon;
          return (
            <section key={i} className={cn("overflow-hidden rounded-md border bg-panel", t.cls)} aria-label={c.title}>
              <p className={cn("flex items-center gap-2 px-4 py-2 font-semibold", t.head)}>
                {c.tone && c.tone !== "neutral" ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
                <span>{c.title}</span>
                {t.label ? <span className="sr-only">({t.label})</span> : null}
              </p>
              <ul className="space-y-2 px-4 py-3">
                {c.points.map((p, j) => (
                  <li key={j} className="flex gap-2 text-ink-2">
                    <Icon className={cn("mt-1.5 size-4 shrink-0", t.iconCls)} aria-hidden />
                    <Markdown inline>{p}</Markdown>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function KeyTermsBlock({ terms }: { terms: VocabEntry[] }) {
  return (
    <div className="my-6 max-w-[72ch] rounded-md border border-line bg-panel break-inside-avoid">
      <p className="border-b border-line px-4 py-2 font-semibold text-ink">คำศัพท์สำคัญ</p>
      <dl className="divide-y divide-line">
        {terms.map((t, i) => (
          <div key={i} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
            <dt>
              <span className="font-semibold text-ink">{t.th}</span>
              <span className="block text-[0.9rem] text-ink-3" lang="en">
                {t.en}
              </span>
            </dt>
            <dd className="text-ink-2">
              <Markdown inline>{t.def}</Markdown>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
