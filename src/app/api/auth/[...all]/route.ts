import { getAuth } from "@/lib/auth";

/** better-auth endpoints (sign-in, OAuth callback, session, sign-out …). */
export async function GET(request: Request) {
  return getAuth().handler(request);
}

export async function POST(request: Request) {
  return getAuth().handler(request);
}
