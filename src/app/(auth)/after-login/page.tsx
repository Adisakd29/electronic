import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor, safeNext } from "@/server/auth";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Landing point after Google sign-in: routes the user by role. */
export default function AfterLogin({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="text-ink-3">กำลังเข้าสู่ระบบ…</p>}>
      <Route searchParams={searchParams} />
    </Suspense>
  );
}

async function Route({ searchParams }: { searchParams: SP }): Promise<null> {
  const sp = await searchParams;
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const ok = next && !(next.startsWith("/teacher") && me.role === "student") && !(next.startsWith("/admin") && me.role !== "admin");
  redirect(me.mustChangePassword ? "/change-password" : ok ? next! : homeFor(me.role));
  return null;
}
