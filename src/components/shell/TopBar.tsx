/** Top app bar (server). The user menu reads the session inside Suspense. */
import { Suspense } from "react";
import Link from "next/link";
import { getSessionUser } from "@/server/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoMark } from "./Logo";
import { NavLinks, NavLinksStatic } from "./NavLinks";
import { Safe } from "./Safe";
import { SignInButton, UserMenu } from "./UserMenu";

async function UserSlot() {
  const user = await getSessionUser();
  return <UserMenu user={user} />;
}

export function TopBar() {
  return (
    <header className="ee-topbar sticky top-0 z-40 h-[60px] border-b border-line bg-panel/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-full max-w-[1480px] items-center gap-2 px-4 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-sm" aria-label="หน้าแรก งานไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น">
          <LogoMark />
          <span className="hidden leading-tight lg:block">
            <span className="block font-bold text-ink">งานไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น</span>
            <span className="block text-[0.8rem] text-ink-3">รหัสวิชา 20100-1005</span>
          </span>
          <span className="font-bold text-ink lg:hidden max-[480px]:hidden">20100-1005</span>
        </Link>
        <span className="flex-1" />
        <Suspense fallback={<NavLinksStatic />}>
          <NavLinks />
        </Suspense>
        <ThemeToggle />
        <Safe fallback={<SignInButton />}>
          <Suspense fallback={<span className="ee-skeleton block h-10 w-24 rounded-sm" aria-hidden />}>
            <UserSlot />
          </Suspense>
        </Safe>
      </div>
    </header>
  );
}
