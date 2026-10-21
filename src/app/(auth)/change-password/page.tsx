import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Alert, Panel } from "@/components/ui";
import { PasswordForm } from "@/components/auth/PasswordForm";
import { getSessionUser, homeFor } from "@/server/auth";

export const metadata: Metadata = { title: "เปลี่ยนรหัสผ่าน" };

export default function ChangePasswordPage() {
  return (
    <Panel className="w-full max-w-md">
      <div className="border-b border-line px-6 py-5">
        <h1 className="text-[1.5rem] font-bold text-ink">เปลี่ยนรหัสผ่าน</h1>
      </div>
      <div className="space-y-5 px-6 py-6">
        <Suspense fallback={<div className="h-80" aria-busy="true" />}>
          <Body />
        </Suspense>
      </div>
    </Panel>
  );
}

async function Body() {
  const me = await getSessionUser();
  if (!me) redirect("/login?next=/change-password");
  return (
    <>
      {me.mustChangePassword ? (
        <Alert tone="warn" title="ตั้งรหัสผ่านใหม่ก่อนเริ่มเรียน">
          คุณกำลังใช้รหัสผ่านชั่วคราวที่ครูสร้างให้ กรุณาตั้งรหัสผ่านใหม่ที่จำได้และไม่บอกผู้อื่น
        </Alert>
      ) : (
        <p className="text-ink-2">
          บัญชี: <span className="font-semibold">{me.username ?? me.email}</span> ·{" "}
          <a className="text-cobalt underline-offset-2 hover:underline" href={homeFor(me.role)}>
            กลับหน้าหลัก
          </a>
        </p>
      )}
      <PasswordForm />
    </>
  );
}
