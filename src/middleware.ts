import { NextResponse, type NextRequest } from "next/server";
import { COMPANY_HEADER, HOME_COOKIE, SESSION_COOKIE, SLUG_PATTERN, verifySession } from "@/lib/session";

/** The app's own pages, which need a session. The home page, /login and company pages (/homeco) are public. */
const PROTECTED = /^\/(home|staff|users|settings|factors|evaluations|salaries|reports|people|me|alerts|platform|account|api)(\/|$)/;

export async function middleware(req: NextRequest) {
  if (!PROTECTED.test(req.nextUrl.pathname)) {
    // A company's sign-in page (e.g. /homeco) is shown in that company's languages.
    const slug = req.nextUrl.pathname.slice(1).toLowerCase();
    if (SLUG_PATTERN.test(slug)) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set(COMPANY_HEADER, slug);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }
  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) {
    const url = req.nextUrl.clone();
    // Back to the company page they last signed in on, else the main sign-in page.
    const home = req.cookies.get(HOME_COOKIE)?.value;
    url.pathname = home && SLUG_PATTERN.test(home) ? `/${home}` : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|svg|webp|ico)$).*)"],
};
