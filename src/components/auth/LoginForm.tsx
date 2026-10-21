"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { signInWithUsername, type AuthFormState } from "@/server/actions/auth";

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signInWithUsername, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? (
        <Alert tone="danger" title="เข้าสู่ระบบไม่สำเร็จ">
          {state.error}
        </Alert>
      ) : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="ชื่อผู้ใช้ (username)" htmlFor="username" hint="ใช้ตัวอักษรภาษาอังกฤษตามที่ครูแจ้ง เช่น student01">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.username ?? ""}
          aria-invalid={state.error ? true : undefined}
        />
      </Field>
      <Field label="รหัสผ่าน" htmlFor="password">
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-12" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-3 hover:text-ink"
            aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            aria-pressed={show}
          >
            {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        <LogIn size={18} aria-hidden />
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
