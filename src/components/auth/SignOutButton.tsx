import { LogOut } from "lucide-react";
import { buttonClass, type ButtonVariant } from "@/components/ui";
import { signOut } from "@/server/actions/auth";

/** Server-rendered sign-out form (works without JavaScript). */
export function SignOutButton({ variant = "ghost", label = "ออกจากระบบ" }: { variant?: ButtonVariant; label?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={buttonClass(variant, "sm")}>
        <LogOut size={16} aria-hidden />
        {label}
      </button>
    </form>
  );
}
