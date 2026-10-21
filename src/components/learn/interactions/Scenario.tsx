"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDot, Flag, XCircle } from "lucide-react";
import type { ScenarioInteraction } from "@/content/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { InteractionShell, RetryButton, useAttempts, type InteractionProps } from "./shell";
import { plain } from "./dnd";

type Hop = { node: string; choice: number };

const toneIcon = (tone?: "good" | "bad" | "neutral") =>
  tone === "good" ? (
    <CheckCircle2 className="size-4 text-ok" aria-hidden />
  ) : tone === "bad" ? (
    <XCircle className="size-4 text-danger" aria-hidden />
  ) : (
    <CircleDot className="size-4 text-ink-3" aria-hidden />
  );

const toneText = { good: "เลือกได้ดี", bad: "ทางเลือกเสี่ยง", neutral: "พอใช้" } as const;

export function Scenario({ it, onResult, variant }: InteractionProps<ScenarioInteraction>) {
  const a = useAttempts(it, onResult);
  const [path, setPath] = useState<Hop[]>([]);
  const current = path.length ? it.nodes[path[path.length - 1].node]?.choices?.[path[path.length - 1].choice]?.next ?? it.start : it.start;
  const node = it.nodes[current];
  const ended = !!node && (!node.choices || node.choices.length === 0);
  const outcome = node?.end ?? (ended ? "neutral" : undefined);

  const choose = (i: number) => {
    const next = [...path, { node: current, choice: i }];
    setPath(next);
    const nextId = node?.choices?.[i]?.next;
    const n = nextId ? it.nodes[nextId] : undefined;
    if (n && (!n.choices || n.choices.length === 0)) {
      const end = n.end ?? "neutral";
      a.report(end !== "bad", next.map((h) => `${h.node}:${h.choice}`).join(">"));
    }
  };

  return (
    <InteractionShell
      it={it}
      variant={variant}
      attempts={a}
      actions={
        path.length > 0 ? (
          <RetryButton
            onClick={() => {
              setPath([]);
              a.reset();
            }}
          >
            เริ่มสถานการณ์ใหม่
          </RetryButton>
        ) : null
      }
      resultText={{ correct: "จบสถานการณ์ด้วยผลที่ปลอดภัย", wrong: "สถานการณ์นี้จบไม่ดี ลองเริ่มใหม่และเลือกทางอื่น" }}
    >
      <h3 className="mb-2 text-[1.05rem] font-semibold text-ink">{it.title}</h3>
      {path.length > 0 ? (
        <ol className="mb-3 space-y-1.5 border-l-2 border-copper/60 pl-4" aria-label="เส้นทางที่เลือกมาแล้ว">
          {path.map((h, i) => {
            const c = it.nodes[h.node]?.choices?.[h.choice];
            return (
              <li key={i} className="flex items-start gap-2 text-[0.95rem] text-ink-2">
                <span className="mt-1">{toneIcon(c?.tone)}</span>
                <span>
                  <span className="sr-only">{c?.tone ? toneText[c.tone] : ""}: </span>
                  {c ? plain(c.text, 120) : ""}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {node ? (
        <div aria-live="polite" className="rounded-md border border-line bg-panel-2/60 px-4 py-3">
          <Markdown>{node.md}</Markdown>
          {node.figure ? <FigureView fig={node.figure} compact /> : null}
          {ended ? (
            <div
              className={cn(
                "mt-3 flex items-start gap-2 rounded-sm border px-3 py-2 font-semibold",
                outcome === "good" && "border-ok/40 bg-ok-soft text-ok",
                outcome === "bad" && "border-danger/40 bg-danger-soft text-danger",
                outcome === "neutral" && "border-line-strong bg-panel text-ink-2",
              )}
            >
              {outcome === "good" ? <Flag className="mt-1 size-4" aria-hidden /> : outcome === "bad" ? <AlertTriangle className="mt-1 size-4" aria-hidden /> : <CircleDot className="mt-1 size-4" aria-hidden />}
              {outcome === "good" ? "ผลลัพธ์: ปลอดภัยและถูกวิธี" : outcome === "bad" ? "ผลลัพธ์: เกิดอันตรายหรือความเสียหาย" : "ผลลัพธ์: ใช้ได้ แต่ยังมีวิธีที่ดีกว่า"}
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {node.choices?.map((c, i) => (
                <Button key={i} variant="secondary" className="h-auto min-h-11 justify-start py-2 text-left font-medium whitespace-normal!" onClick={() => choose(i)}>
                  <Markdown inline>{c.text}</Markdown>
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-danger">ข้อมูลสถานการณ์ไม่ครบ (ไม่พบขั้นตอน “{current}”) แจ้งครูผู้สอน</p>
      )}
    </InteractionShell>
  );
}
