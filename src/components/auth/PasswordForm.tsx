"use client";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { changePassword, type AuthFormState } from "@/server/actions/auth";

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="danger" title="ยังเปลี่ยนรหัสผ่านไม่ได้">{state.error}</Alert> : null}
      <Field label="รหัสผ่านปัจจุบัน" htmlFor="current" hint="ถ้าครูเพิ่งรีเซ็ตรหัสผ่าน ให้ใช้รหัสผ่านชั่วคราวที่ได้รับ">
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="รหัสผ่านใหม่" htmlFor="password" hint="อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="ยืนยันรหัสผ่านใหม่" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        <KeyRound size={18} aria-hidden />
        {pending ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
      </Button>
    </form>
  );
}
