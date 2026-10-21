"use client";
import type { Block, Interaction, WorkedExample } from "@/content/types";
import { Markdown } from "../Markdown";
import { FigureView } from "../FigureView";
import { InteractionView, MissingInteraction } from "../interactions/InteractionView";
import { Callout } from "./Callout";
import { CompareBlock, FormulaBlock, KeyTermsBlock, ProcedureBlock, TableBlock } from "./basic";
import { LabEmbed, WorkedExampleView } from "./client";
import { BookOpen, Sparkles } from "lucide-react";
import { Disclosure } from "@/components/ui/client";
import { TrackNotes } from "../track";

export function BlockRenderer({
  block,
  interactions,
  examples,
}: {
  block: Block;
  interactions: Record<string, Interaction>;
  examples: Record<string, WorkedExample>;
}) {
  switch (block.type) {
    case "md":
      return <Markdown className="my-4">{block.md}</Markdown>;
    case "callout":
      return <Callout variant={block.variant} title={block.title} md={block.md} />;
    case "formula":
      return <FormulaBlock tex={block.tex} label={block.label} vars={block.vars} note={block.note} />;
    case "figure":
      return <FigureView fig={block} />;
    case "table":
      return <TableBlock caption={block.caption} headers={block.headers} rows={block.rows} note={block.note} />;
    case "procedure":
      return <ProcedureBlock title={block.title} items={block.items} />;
    case "compare":
      return <CompareBlock title={block.title} columns={block.columns} />;
    case "interaction": {
      const it = interactions[block.ref];
      return it ? <InteractionView it={it} /> : <MissingInteraction id={block.ref} />;
    }
    case "example": {
      const ex = examples[block.ref];
      if (!ex) return <MissingInteraction id={block.ref} />;
      return <WorkedExampleView ex={ex} tryIt={ex.tryIt ? interactions[ex.tryIt] : undefined} />;
    }
    case "lab":
      return <LabEmbed lab={block.lab} preset={block.preset} md={block.md} />;
    case "keyterms":
      return <KeyTermsBlock terms={block.terms} />;
    case "plain":
      return (
        <aside aria-label={block.title ?? "เข้าใจแบบง่าย ๆ ก่อน"} className="ee-plain my-5 max-w-[72ch] rounded-md border-l-4 border-ok bg-ok-soft/50 px-4 py-3 break-inside-avoid">
          <p className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="size-5 shrink-0 text-ok" aria-hidden />
            {block.title ?? "เข้าใจแบบง่าย ๆ ก่อน"}
          </p>
          <Markdown className="text-[1.04rem] text-ink [&_p:last-child]:mb-0">{block.md}</Markdown>
        </aside>
      );
    case "deeper":
      return (
        <div className="ee-deeper my-5 max-w-[72ch] rounded-md border border-dashed border-line-strong bg-panel">
          <Disclosure
            summary={
              <span>
                <span className="text-ink-3">ลงลึก (อ่านเพิ่ม · ไม่ออกสอบ): </span>
                {block.title}
              </span>
            }
            icon={<BookOpen className="size-5 shrink-0 text-ink-3" aria-hidden />}
          >
            <div className="px-4 pb-3">
              <Blocks blocks={block.blocks} interactions={interactions} examples={examples} />
            </div>
          </Disclosure>
        </div>
      );
    case "track":
      return <TrackNotes notes={block.notes} title={block.title} />;
    default:
      return null;
  }
}

export function Blocks({ blocks, interactions, examples }: { blocks: Block[]; interactions: Record<string, Interaction>; examples: Record<string, WorkedExample> }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockRenderer key={i} block={b} interactions={interactions} examples={examples} />
      ))}
    </>
  );
}
