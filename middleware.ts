import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Admin authorization happens in the server layout via getActSession(), which
  // understands both Supabase Auth and the legacy act_session cookie. Middleware
  // only sees the legacy cookie, so enforcing role checks here can block valid
  // Supabase Super Admin sessions after role-switch testing.

  // One canonical host. www and the apex resolve to the same server, so without
  // this the app answers on both — two URLs for every page, split sessions, and
  // duplicate content as far as search engines are concerned.
  //
  // Note this only runs once TLS has succeeded. If the reverse proxy has no
  // certificate for the www hostname, the browser fails before the request ever
  // reaches Next, and no redirect written here can help.
  const host = request.headers.get("host");
  if (host?.toLowerCase().startsWith("www.")) {
    const url = request.nextUrl.clone();
    // hostname + an explicit empty port, not `host`. The URL spec's `host`
    // setter only overwrites the port when the value it's given contains one,
    // so assigning a bare hostname left `nextUrl`'s internal port in place and
    // sent visitors to https://actsto.org:3000/ — a port the proxy doesn't
    // publish.
    url.hostname = host.slice(4).split(":")[0];
    url.port = "";
    // TLS terminates at the proxy, so the request Next sees is plain http.
    // Redirecting to that would bounce the visitor through an insecure hop.
    url.protocol = "https:";
    // 308 rather than 301: it preserves the method and body, so a POST to a www
    // URL isn't silently downgraded to a GET.
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's internals and static files. The redirect has to see
  // every route to be useful, but there's no reason to wake it for an image.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)"],
};
