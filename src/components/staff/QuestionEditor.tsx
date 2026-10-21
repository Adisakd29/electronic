"use client";
import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { Markdown } from "@/components/learn/Markdown";
import { ActionForm } from "./ActionForm";
import { saveQuestionAction } from "@/server/actions/teacher";

export interface EditableQuestion {
  id: string | null;
  week: number;
  type: "mcq" | "tf" | "numeric";
  bloom: string;
  objective: string | null;
  stem: string;
  choices: { id: string; text: string }[] | null;
  answer: string;
  tolerance: number | null;
  unit: string | null;
  explanation: string;
  feedback: Record<string, string> | null;
  active: boolean;
}

const IDS = ["a", "b", "c", "d"] as const;
const TH: Record<string, string> = { a: "ก", b: "ข", c: "ค", d: "ง" };

export function QuestionEditor({ q }: { q: EditableQuestion }) {
  const [type, setType] = useState(q.type);
  const [stem, setStem] = useState(q.stem);
  const [choices, setChoices] = useState<Record<string, string>>(Object.fromEntries(IDS.map((id) => [id, q.choices?.find((c) => c.id === id)?.text ?? ""])));
  const [answer, setAnswer] = useState(q.type === "mcq" ? q.answer : "a");
  const [explanation, setExplanation] = useState(q.explanation);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ActionForm action={saveQuestionAction} submitLabel={q.id ? "บันทึกการแก้ไข" : "เพิ่มข้อสอบ"}>
        {q.id ? <input type="hidden" name="id" value={q.id} /> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="สัปดาห์" htmlFor="week">
            <Select id="week" name="week" defaultValue={q.week} disabled={Boolean(q.id)}>
              {Array.from({ length: 18 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </Select>
            {q.id ? <input type="hidden" name="week" value={q.week} /> : null}
          </Field>
          <Field label="ชนิด" htmlFor="type">
            <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as EditableQuestion["type"])}>
              <option value="mcq">เลือกตอบ 4 ตัวเลือก</option>
              <option value="tf">ถูก/ผิด</option>
              <option value="numeric">คำตอบเป็นตัวเลข</option>
            </Select>
          </Field>
          <Field label="ระดับ (Bloom)" htmlFor="bloom">
            <Select id="bloom" name="bloom" defaultValue={q.bloom}>
              <option value="remember">จำ (remember)</option>
              <option value="understand">เข้าใจ (understand)</option>
              <option value="apply">ประยุกต์ (apply)</option>
              <option value="analyze">วิเคราะห์ (analyze)</option>
              <option value="evaluate">ประเมิน (evaluate)</option>
            </Select>
          </Field>
        </div>
        <Field label="จุดประสงค์ (ไม่บังคับ)" htmlFor="objective" hint="เช่น W03-K1">
          <Input id="objective" name="objective" defaultValue={q.objective ?? ""} maxLength={40} />
        </Field>
        <Field label="โจทย์" htmlFor="stem" hint="รองรับ Markdown และสูตร KaTeX เช่น $V = I \times R$">
          <Textarea id="stem" name="stem" value={stem} onChange={(e) => setStem(e.target.value)} required maxLength={4000} />
        </Field>
        {type === "mcq" ? (
          <fieldset className="space-y-3 rounded-sm border border-line p-3">
            <legend className="px-1 font-semibold">ตัวเลือก (เลือกข้อที่ถูก)</legend>
            {IDS.map((id) => (
              <div key={id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input type="radio" name="answer-mcq" value={id} checked={answer === id} onChange={() => setAnswer(id)} aria-label={`ตัวเลือก ${TH[id]} เป็นคำตอบที่ถูก`} />
                  <span className="w-5 font-semibold">{TH[id]}</span>
                  <Input name={`choice-${id}`} value={choices[id]} onChange={(e) => setChoices((c) => ({ ...c, [id]: e.target.value }))} required maxLength={1000} aria-label={`ตัวเลือก ${TH[id]}`} />
                </div>
                {answer !== id ? (
                  <Input name={`feedback-${id}`} defaultValue={q.feedback?.[id] ?? ""} maxLength={1000} placeholder={`เหตุผลที่ตัวเลือก ${TH[id]} ผิด (แสดงเมื่อนักเรียนเลือกข้อนี้)`} aria-label={`คำอธิบายเมื่อเลือก ${TH[id]}`} className="ml-12 w-[calc(100%-3rem)]" />
                ) : null}
              </div>
            ))}
          </fieldset>
        ) : type === "tf" ? (
          <Field label="คำตอบที่ถูก" htmlFor="answer-tf">
            <Select id="answer-tf" name="answer-tf" defaultValue={q.type === "tf" ? q.answer : "true"}>
              <option value="true">ถูก</option>
              <option value="false">ผิด</option>
            </Select>
          </Field>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="คำตอบ (ตัวเลข)" htmlFor="answer-numeric">
              <Input id="answer-numeric" name="answer-numeric" inputMode="decimal" defaultValue={q.type === "numeric" ? q.answer : ""} required />
            </Field>
            <Field label="หน่วย" htmlFor="unit">
              <Input id="unit" name="unit" defaultValue={q.unit ?? ""} maxLength={20} placeholder="เช่น mA" />
            </Field>
            <Field label="ความคลาดเคลื่อน (%)" htmlFor="tolerance" hint="ค่าเริ่มต้น 2 %">
              <Input id="tolerance" name="tolerance" type="number" step="0.5" min={0} max={100} defaultValue={q.tolerance != null ? q.tolerance * 100 : ""} />
            </Field>
          </div>
        )}
        <Field label="คำอธิบายเฉลย" htmlFor="explanation" hint="อธิบายว่าทำไมคำตอบนี้ถูก (ไม่เกิน ~60 คำ)">
          <Textarea id="explanation" name="explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} required maxLength={4000} />
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={q.active} /> ใช้ข้อนี้ในการสุ่มข้อสอบ
        </label>
      </ActionForm>
      <section aria-label="ตัวอย่างที่นักเรียนเห็น" className="rounded-md border border-line bg-panel p-4">
        <h2 className="mb-3 font-semibold text-ink-3">ตัวอย่างที่นักเรียนเห็น</h2>
        <div className="prose-sm text-ink">
          <Markdown>{stem || "_(โจทย์)_"}</Markdown>
        </div>
        {type === "mcq" ? (
          <ul className="mt-3 space-y-2">
            {IDS.map((id) => (
              <li key={id} className={`rounded-sm border px-3 py-2 ${answer === id ? "border-ok bg-ok-soft" : "border-line"}`}>
                <span className="mr-2 font-semibold">{TH[id]}.</span>
                <Markdown inline>{choices[id] || "…"}</Markdown>
              </li>
            ))}
          </ul>
        ) : type === "tf" ? (
          <p className="mt-3 text-ink-2">ตัวเลือก: ถูก / ผิด</p>
        ) : (
          <p className="mt-3 text-ink-2">นักเรียนพิมพ์คำตอบเป็นตัวเลข</p>
        )}
        <div className="mt-4 rounded-sm bg-panel-2 p-3">
          <p className="font-semibold">เฉลย</p>
          <Markdown>{explanation || "…"}</Markdown>
        </div>
      </section>
    </div>
  );
}
