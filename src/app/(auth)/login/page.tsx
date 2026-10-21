import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Alert, Panel } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { googleEnabled } from "@/lib/env";
import { getSessionUser, homeFor, safeNext } from "@/server/auth";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

const ERRORS: Record<string, string> = {
  GOOGLE_NOT_ALLOWED: "บัญชี Google นี้ยังไม่ได้รับอนุญาต กรุณาติดต่อครูผู้สอน",
  google_not_allowed: "บัญชี Google นี้ยังไม่ได้รับอนุญาต กรุณาติดต่อครูผู้สอน",
  ACCOUNT_DISABLED: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อครูผู้สอนหรือผู้ดูแลระบบ",
  account_disabled: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อครูผู้สอนหรือผู้ดูแลระบบ",
  GOOGLE_DISABLED: "ระบบนี้ยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google กรุณาใช้ชื่อผู้ใช้และรหัสผ่าน",
  GOOGLE_FAILED: "เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SP }) {
  return (
    <Panel className="w-full max-w-md">
      <div className="border-b border-line px-6 py-5">
        <h1 className="text-[1.5rem] font-bold text-ink">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-ink-3">ใช้ชื่อผู้ใช้และรหัสผ่านที่ได้รับจากครูผู้สอน</p>
      </div>
      <div className="space-y-5 px-6 py-6">
        <Suspense fallback={<div className="h-72" aria-busy="true" />}>
          <LoginBody searchParams={searchParams} />
        </Suspense>
        <p className="text-center text-[0.95rem] text-ink-3">ลืมรหัสผ่าน? ติดต่อครูผู้สอนเพื่อรีเซ็ต</p>
      </div>
    </Panel>
  );
}

async function LoginBody({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) ?? null;
  const next = safeNext(one("next"));
  const me = await getSessionUser();
  if (me) redirect(me.mustChangePassword ? "/change-password" : next ?? homeFor(me.role));
  const err = one("error");
  const message = err ? ERRORS[err] ?? (err.toLowerCase().includes("not_allowed") ? ERRORS.GOOGLE_NOT_ALLOWED : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง") : null;
  const google = googleEnabled();
  return (
    <>
      {message ? <Alert tone="danger" title="เข้าสู่ระบบไม่สำเร็จ">{message}</Alert> : null}
      {one("signedOut") ? <Alert tone="ok">ออกจากระบบเรียบร้อยแล้ว</Alert> : null}
      <LoginForm next={next} />
      {google ? (
        <>
          <div className="flex items-center gap-3 text-[0.9rem] text-ink-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            หรือ
            <span className="h-px flex-1 bg-line" />
          </div>
          <GoogleButton next={next} />
          <p className="text-[0.88rem] text-ink-3">สำหรับอีเมลของสถานศึกษาที่ครูอนุญาตไว้แล้วเท่านั้น</p>
        </>
      ) : null}
    </>
  );
}
