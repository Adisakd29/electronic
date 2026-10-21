import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, CircleAlert, ShieldCheck } from "lucide-react";
import { course } from "@/content/course";
import { getCertificateByCode } from "@/server/queries";
import { normalizeCertificateCode } from "@/server/core/certificate";
import { Input } from "@/components/ui";
import { thaiDate } from "@/components/certificate/thaiDate";

export const metadata: Metadata = {
  title: "ตรวจสอบใบประกาศนียบัตร",
  description: `ตรวจสอบความถูกต้องของใบประกาศนียบัตรรายวิชา ${course.code} ${course.name} ด้วยรหัสตรวจสอบ`,
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function VerifyPage({ searchParams }: { searchParams: SP }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[720px] px-4 py-10 outline-none sm:px-6">
      <ShieldCheck className="size-10 text-copper" aria-hidden />
      <h1 className="mt-3 text-[1.7rem] font-bold leading-tight text-ink md:text-[1.9rem]">ตรวจสอบใบประกาศนียบัตร</h1>
      <p className="mt-2 max-w-[60ch] text-ink-2">
        พิมพ์รหัสตรวจสอบที่มุมขวาล่างของใบประกาศนียบัตรรายวิชา {course.code} {course.name} ระบบจะบอกว่าใบนั้นออกโดยระบบนี้จริงหรือไม่
      </p>
      <Suspense fallback={<VerifyForm defaultValue="" />}>
        <VerifyResult searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function VerifyForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form method="get" action="/certificate/verify" className="mt-6 rounded-md border border-line bg-panel p-5 shadow-1">
      <label htmlFor="cert-code" className="block font-medium text-ink">
        รหัสตรวจสอบ
      </label>
      <div className="mt-1.5 flex flex-wrap gap-3">
        <Input
          id="cert-code"
          name="code"
          defaultValue={defaultValue}
          placeholder="EE-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          required
          aria-describedby="cert-code-hint"
          className="readout min-w-0 flex-1 basis-56 uppercase tracking-wider"
        />
        <button type="submit" className="inline-flex h-11 items-center justify-center rounded-sm bg-cobalt px-5 font-semibold text-white hover:bg-cobalt-ink dark:text-paper">
          ตรวจสอบ
        </button>
      </div>
      <p id="cert-code-hint" className="mt-1.5 text-[0.88rem] text-ink-3">
        รหัสขึ้นต้นด้วย EE ตามด้วยตัวอักษรและตัวเลข 8 ตัว เช่น EE-7KQ2-MX9P
      </p>
    </form>
  );
}

async function VerifyResult({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const raw = typeof sp.code === "string" ? sp.code.slice(0, 40) : "";
  if (!raw.trim()) return <VerifyForm defaultValue="" />;
  const code = normalizeCertificateCode(raw);
  const cert = code ? await getCertificateByCode(code) : null;
  return (
    <>
      <VerifyForm defaultValue={code ?? raw} />
      <div aria-live="polite" className="mt-5">
        {!code ? (
          <Result tone="warn" title="รูปแบบรหัสไม่ถูกต้อง">
            รหัสต้องมีรูปแบบ EE-XXXX-XXXX (ไม่มีตัว O, I, 0 และ 1) ตรวจสอบตัวอักษรอีกครั้งแล้วกดตรวจสอบ
          </Result>
        ) : cert ? (
          <Result tone="ok" title="ใบประกาศนียบัตรนี้ถูกต้อง">
            <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
              <dt className="text-ink-3">ชื่อผู้เรียน</dt>
              <dd className="font-semibold text-ink">{cert.name}</dd>
              <dt className="text-ink-3">รายวิชา</dt>
              <dd className="text-ink">
                {course.code} {course.name}
              </dd>
              <dt className="text-ink-3">วันที่ออก</dt>
              <dd className="text-ink">{thaiDate(cert.issuedAt)}</dd>
              <dt className="text-ink-3">รหัสตรวจสอบ</dt>
              <dd className="readout text-ink">{cert.code}</dd>
            </dl>
            <Link href={`/certificate/${cert.code}`} className="mt-3 inline-block font-semibold text-cobalt-ink underline underline-offset-4">
              เปิดใบประกาศนียบัตร
            </Link>
          </Result>
        ) : (
          <Result tone="danger" title="ไม่พบใบประกาศนียบัตร">
            ไม่มีใบประกาศนียบัตรที่ใช้รหัส <span className="readout">{code}</span> หรือใบนั้นถูกยกเลิกแล้ว ตรวจสอบรหัสอีกครั้ง หากมั่นใจว่ารหัสถูกต้อง ให้ติดต่อครูผู้สอน
          </Result>
        )}
      </div>
    </>
  );
}

function Result({ tone, title, children }: { tone: "ok" | "warn" | "danger"; title: string; children: React.ReactNode }) {
  const Icon = tone === "ok" ? BadgeCheck : CircleAlert;
  const cls = { ok: "border-ok/40 bg-ok-soft text-ok", warn: "border-warn/40 bg-warn-soft text-warn", danger: "border-danger/40 bg-danger-soft text-danger" }[tone];
  return (
    <div className={`flex gap-3 rounded-md border px-4 py-4 ${cls}`}>
      <Icon className="mt-1 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <div className="text-ink-2">{children}</div>
      </div>
    </div>
  );
}
