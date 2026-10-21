/**
 * Public certificate lookup (used by /certificate/[code] and /certificate/verify).
 * Returns only what is printed on the certificate: name, issue date, code.
 */
import { eq } from "drizzle-orm";
import type { Tx } from "@/lib/db";
import { certificate } from "@/lib/db/schema";
import type { PublicCertificate } from "../contracts";

/** Codes look like EE-7KQ2-MX9P (alphabet of randomCode: no 0/O/1/I). */
export const CERTIFICATE_CODE_RE = /^EE-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/** Trim/upper-case user input; null when it cannot be a certificate code. */
export function normalizeCertificateCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (s.length > 20) return null;
  const withDashes = /^EE[A-Z0-9]{8}$/.test(s) ? `EE-${s.slice(2, 6)}-${s.slice(6)}` : s;
  return CERTIFICATE_CODE_RE.test(withDashes) ? withDashes : null;
}

/** A valid (not revoked) certificate by its verification code, else null. */
export async function certificateByCode(tx: Tx, raw: string): Promise<PublicCertificate | null> {
  const code = normalizeCertificateCode(raw);
  if (!code) return null;
  const [c] = await tx
    .select({ code: certificate.code, name: certificate.nameOnCertificate, issuedAt: certificate.issuedAt, revoked: certificate.revoked })
    .from(certificate)
    .where(eq(certificate.code, code))
    .limit(1);
  if (!c || c.revoked) return null;
  return { code: c.code, name: c.name, issuedAt: c.issuedAt.toISOString() };
}
