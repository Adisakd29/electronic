"use client";
/**
 * Free-play lab (/labs/[id]): the lab loads client-side, the learner picks a
 * preset and experiments. No tasks, nothing is saved.
 */
import { useId, useState } from "react";
import { Info, RotateCcw } from "lucide-react";
import type { LabId } from "@/content/types";
import type { LabModule } from "@/labs/types";
import { Button, Select } from "@/components/ui";
import { Disclosure } from "@/components/ui/client";
import { LabFrame } from "./useLab";

export function FreeLab({ id }: { id: LabId }) {
  const [mod, setMod] = useState<LabModule | null>(null);
  const [preset, setPreset] = useState("default");
  const [resetKey, setResetKey] = useState(0);
  const selectId = useId();

  const presets = mod ? Object.entries(mod.presets) : [];
  const current = mod?.presets[preset] ?? (presets[0]?.[1] ?? null);
  // A lab may not define "default"; fall back to its first preset key.
  const activePreset = mod && !mod.presets[preset] && presets[0] ? presets[0][0] : preset;

  return (
    <div className="space-y-4">
      {mod?.description ? <p className="max-w-[72ch] text-ink-2">{mod.description}</p> : null}

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-md border border-line bg-panel px-4 py-3">
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor={selectId} className="block font-medium text-ink">
            ชุดค่าเริ่มต้น
          </label>
          <Select
            id={selectId}
            value={activePreset}
            onChange={(e) => setPreset(e.target.value)}
            disabled={!mod || presets.length < 2}
            aria-describedby={`${selectId}-desc`}
            className="mt-1.5"
          >
            {presets.length ? (
              presets.map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))
            ) : (
              <option value="default">กำลังโหลด…</option>
            )}
          </Select>
        </div>
        <Button variant="secondary" onClick={() => setResetKey((k) => k + 1)} disabled={!mod}>
          <RotateCcw className="size-4" aria-hidden />
          เริ่มชุดนี้ใหม่
        </Button>
        <p id={`${selectId}-desc`} className="w-full text-[0.95rem] text-ink-3" aria-live="polite">
          {current?.description ?? "เลือกชุดค่าเพื่อเริ่มจากสถานการณ์ที่ต่างกัน ค่าที่ปรับไว้จะกลับเป็นค่าของชุดนั้น"}
        </p>
      </div>

      <div key={resetKey}>
        <LabFrame id={id} preset={activePreset} onModule={setMod} />
      </div>

      {mod?.assumptions.length ? (
        <div className="rounded-md border border-line bg-panel">
          <Disclosure summary="ข้อสมมติและขอบเขตความแม่นยำ" icon={<Info className="size-5 text-info" aria-hidden />} defaultOpen>
            <ul className="list-disc space-y-1.5 px-4 pb-4 pl-10 text-ink-2">
              {mod.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Disclosure>
        </div>
      ) : null}
    </div>
  );
}
