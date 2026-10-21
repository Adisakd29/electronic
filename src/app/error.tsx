"use client";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" tabIndex={-1} className="mx-auto grid w-full max-w-[640px] flex-1 content-center px-4 py-16 outline-none">
      <h1 className="text-[1.6rem] font-bold text-ink">หน้านี้โหลดไม่สำเร็จ</h1>
      <p className="mt-2 text-ink-2">ระบบเกิดข้อผิดพลาดระหว่างเตรียมหน้านี้ ความก้าวหน้าที่บันทึกไว้แล้วไม่หาย กดลองอีกครั้ง ถ้ายังไม่ได้ให้รีเฟรชหน้า หรือแจ้งครูผู้สอนพร้อมรหัสด้านล่าง</p>
      {error.digest ? (
        <p className="mt-3 text-[0.92rem] text-ink-3">
          รหัสข้อผิดพลาด: <span className="readout">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button onClick={() => retry()}>
          <RotateCcw className="size-4" aria-hidden />
          ลองอีกครั้ง
        </Button>
        <Link href="/" className="font-semibold text-cobalt-ink underline underline-offset-4">
          กลับหน้าแรก
        </Link>
      </div>
    </main>
  );
}
