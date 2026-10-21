import { Suspense } from "react";
import { getSidebarData } from "@/server/queries";
import { AppShell } from "@/components/shell/AppShell";
import { WeekNav } from "@/components/shell/WeekNav";
import { Safe } from "@/components/shell/Safe";

async function SidebarLoader() {
  const data = await getSidebarData();
  return <WeekNav data={data} />;
}

/** Learning shell for /learn, /labs and /dashboard: 18-week sidebar + main column. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const nav = (
    <Safe fallback={<WeekNav data={null} />}>
      <Suspense fallback={<WeekNav data={null} loading />}>
        <SidebarLoader />
      </Suspense>
    </Safe>
  );
  return <AppShell nav={nav}>{children}</AppShell>;
}
