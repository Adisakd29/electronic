import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { PageSkeleton, spGetter, type SP } from "@/components/staff/context";
import { QuestionEditor, type EditableQuestion } from "@/components/staff/QuestionEditor";
import { requireUser } from "@/server/auth";
import { questionById } from "@/server/core/staff";

export const metadata: Metadata = { title: "แก้ไขข้อสอบ" };

type Params = Promise<{ id: string }>;

export default function QuestionPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Body params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ params, searchParams }: { params: Params; searchParams: SP }) {
  await requireUser(["teacher", "admin"]);
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  const one = spGetter(await searchParams);
  let q: EditableQuestion;
  if (id === "new") {
    const w = Number(one("week"));
    q = { id: null, week: Number.isInteger(w) && w >= 1 && w <= 18 ? w : 1, type: "mcq", bloom: "understand", objective: null, stem: "", choices: null, answer: "a", tolerance: null, unit: null, explanation: "", feedback: null, active: true };
  } else {
    const row = await questionById(db, id);
    if (!row) return <EmptyState title="ไม่พบข้อสอบนี้" action={<Link className="text-cobalt hover:underline" href="/teacher/questions">กลับไปคลังข้อสอบ</Link>} />;
    q = { ...row, id: row.id };
  }
  return (
    <>
      <PageHeader
        kicker={<Link className="hover:underline" href={`/teacher/questions?week=${q.week}`}>← คลังข้อสอบ สัปดาห์ที่ {q.week}</Link>}
        title={q.id ? `แก้ไขข้อสอบ ${q.id}` : "เพิ่มข้อสอบใหม่"}
        description="ข้อสอบที่ครูแก้ไขจะไม่ถูกเขียนทับเมื่อนำเข้าเนื้อหาใหม่ ข้อสอบที่ปิดใช้จะไม่ถูกสุ่ม แต่ผลเดิมยังอยู่"
      />
      <QuestionEditor q={q} />
    </>
  );
}
