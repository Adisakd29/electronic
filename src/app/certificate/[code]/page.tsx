import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, SearchX } from "lucide-react";
import { course } from "@/content/course";
import { getCertificateByCode } from "@/server/queries";
import type { PublicCertificate } from "@/server/contracts";
import { LinkButton } from "@/components/ui";
import { LogoMark } from "@/components/shell/Logo";
import { PrintButton } from "@/components/certificate/PrintButton";
import { thaiDateFormal } from "@/components/certificate/thaiDate";

export const metadata: Metadata = {
  title: "ใบประกาศนียบัตร",
  description: `ใบประกาศนียบัตรผู้เรียนจบรายวิชา ${course.code} ${course.name}`,
  robots: { index: false, follow: false },
};

type Params = Promise<{ code: string }>;

export default function CertificatePage({ params }: { params: Params }) {
  return (
    <main id="main" tabIndex={-1} className="ee-certificate-page mx-auto w-full max-w-[1120px] px-4 py-6 outline-none sm:px-6 sm:py-10">
      <Suspense fallback={<CertificateSkeleton />}>
        <CertificateLoader params={params} />
      </Suspense>
    </main>
  );
}

async function CertificateLoader({ params }: { params: Params }) {
  const { code } = await params;
  let raw = code;
  try {
    raw = decodeURIComponent(code);
  } catch {
    /* keep as-is */
  }
  const cert = await getCertificateByCode(raw);
  if (!cert) return <CertificateMissing />;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="inline-flex items-center gap-2 font-semibold text-ok" role="status">
          <BadgeCheck className="size-5" aria-hidden />
          ใบประกาศนียบัตรนี้ออกโดยระบบจริงและยังมีผลอยู่
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/certificate/verify" className="font-semibold text-cobalt-ink underline underline-offset-4">
            ตรวจสอบรหัสอื่น
          </Link>
          <PrintButton />
        </div>
      </div>
      <CertificateSheet cert={cert} />
      <p className="mt-4 text-[0.92rem] text-ink-3 print:hidden">
        พิมพ์บนกระดาษ A4 แนวนอน หากเบราว์เซอร์ถาม ให้เลือก “พิมพ์กราฟิกพื้นหลัง” เพื่อให้กรอบสีทองแดงออกมาด้วย
      </p>
    </>
  );
}

function CertificateSheet({ cert }: { cert: PublicCertificate }) {
  return (
    <article
      className="ee-certificate relative mx-auto w-full overflow-hidden rounded-md border border-line bg-panel shadow-2 sm:aspect-[297/210]"
      aria-label={`ใบประกาศนียบัตรของ ${cert.name}`}
    >
      {/* copper frame + PCB mounting holes */}
      <div aria-hidden className="ee-cert-frame pointer-events-none absolute inset-3 rounded-[6px] border-[3px] border-copper sm:inset-5" />
      <div aria-hidden className="ee-cert-frame-inner pointer-events-none absolute inset-[22px] rounded-[3px] border border-copper/50 sm:inset-[34px]" />
      {["left-12 top-12", "right-12 top-12", "bottom-12 left-12", "bottom-12 right-12"].map((pos) => (
        <span key={pos} aria-hidden className={`ee-cert-hole absolute hidden size-5 rounded-full border-[3px] border-copper bg-paper sm:block ${pos}`} />
      ))}

      <div className="ee-cert-body relative flex h-full flex-col items-center px-7 py-10 text-center sm:px-[8%] sm:py-[5.5%]">
        <div className="flex items-center gap-2.5 text-ink-2">
          <LogoMark className="size-8" />
          <span className="text-[0.95rem]">
            รายวิชา {course.code} · {course.level}
          </span>
        </div>

        <h1 className="ee-cert-title mt-4 text-[1.9rem] font-bold leading-tight text-ink sm:text-[2.5rem]">ใบประกาศนียบัตร</h1>
        <p className="ee-cert-sub text-[1rem] tracking-wide text-ink-3" lang="en">
          Certificate of Completion
        </p>

        <p className="mt-5 text-ink-2 sm:mt-[3%]">ให้ไว้เพื่อแสดงว่า</p>
        <p className="ee-cert-name mt-1 max-w-full break-words border-b-2 border-copper/60 px-4 pb-1 text-[1.8rem] font-bold leading-snug text-ink sm:text-[2.4rem]">
          {cert.name}
        </p>

        <p className="mt-4 max-w-[60ch] text-ink-2 sm:mt-[2.5%]">
          ได้เรียนครบทั้ง {course.weeks} สัปดาห์และผ่านการประเมินสมรรถนะปลายภาคของรายวิชา
        </p>
        <p className="ee-cert-course mt-1 text-[1.2rem] font-semibold text-ink sm:text-[1.4rem]">
          {course.code} {course.name}
        </p>
        <p className="text-[0.95rem] text-ink-3" lang="en">
          {course.nameEn} · ทฤษฎี {course.credits.theory} ปฏิบัติ {course.credits.practice} หน่วยกิต {course.credits.credits}
        </p>

        <p className="mt-4 text-ink-2 sm:mt-[2.5%]">ให้ไว้ ณ {thaiDateFormal(cert.issuedAt)}</p>

        <div className="mt-8 grid w-full gap-6 sm:mt-auto sm:grid-cols-2 sm:items-end sm:gap-10">
          <div className="text-center sm:text-left">
            <div aria-hidden className="mx-auto h-10 w-56 border-b border-dashed border-ink-3 sm:mx-0" />
            <p className="mt-1 text-[0.95rem] text-ink-2">ครูผู้สอนประจำรายวิชา</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-[0.88rem] text-ink-3">รหัสตรวจสอบ</p>
            <p className="readout text-[1.15rem] font-semibold tracking-wider text-ink">{cert.code}</p>
            <p className="text-[0.85rem] text-ink-3">ตรวจสอบความถูกต้องได้ที่หน้า /certificate/verify</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function CertificateMissing() {
  return (
    <div className="mx-auto max-w-[640px] py-10">
      <SearchX className="size-10 text-ink-3" aria-hidden />
      <h1 className="mt-3 text-[1.7rem] font-bold text-ink">ไม่พบใบประกาศนียบัตร</h1>
      <p className="mt-2 text-ink-2">
        ไม่มีใบประกาศนียบัตรที่ตรงกับรหัสนี้ หรือใบประกาศนียบัตรถูกยกเลิกแล้ว ตรวจสอบว่าพิมพ์รหัสครบ เช่น <span className="readout">EE-7KQ2-MX9P</span>{" "}
        แล้วลองค้นหาอีกครั้ง หากยังไม่พบ ให้ติดต่อครูผู้สอน
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <LinkButton href="/certificate/verify">ตรวจสอบรหัสใหม่</LinkButton>
        <Link href="/" className="font-semibold text-cobalt-ink underline underline-offset-4">
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}

function CertificateSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดใบประกาศนียบัตร">
      <div className="mb-5 flex justify-end">
        <div className="ee-skeleton h-11 w-52 rounded-sm" />
      </div>
      <div className="ee-skeleton mx-auto min-h-96 w-full rounded-md sm:aspect-[297/210] sm:min-h-0" />
    </div>
  );
}
