import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { LinkButton, Panel } from "@/components/ui";
import { getSessionUser, homeFor } from "@/server/auth";

export const metadata: Metadata = { title: "ไม่มีสิทธิ์เข้าถึง" };

export default function Forbidden() {
  return (
    <Panel className="w-full max-w-lg px-6 py-8 text-center">
      <ShieldAlert className="mx-auto text-warn" size={40} aria-hidden />
      <h1 className="mt-3 text-[1.5rem] font-bold text-ink">ไม่มีสิทธิ์เข้าถึงหน้านี้ (403)</h1>
      <p className="mt-2 text-ink-2">หน้านี้สำหรับผู้ใช้บทบาทอื่น หากคิดว่าควรเข้าได้ กรุณาติดต่อครูผู้สอนหรือผู้ดูแลระบบ</p>
      <div className="mt-6 flex justify-center">
        <Suspense fallback={<LinkButton href="/">กลับหน้าแรก</LinkButton>}>
          <Home />
        </Suspense>
      </div>
    </Panel>
  );
}

async function Home() {
  const me = await getSessionUser();
  return <LinkButton href={me ? homeFor(me.role) : "/login"}>{me ? "กลับหน้าหลักของฉัน" : "เข้าสู่ระบบ"}</LinkButton>;
}
