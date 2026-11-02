import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "thr_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;
/** The company address (e.g. "cmtb") a user last signed in on, so an expired session returns them there. */
export const HOME_COOKIE = "thr_home";
/** Set by the middleware on a company's sign-in page (e.g. /cmtb), naming that company. */
export const COMPANY_HEADER = "x-company-slug";

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (at least 16 characters)");
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

/** Returns the user id stored in a valid session token, or null. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
