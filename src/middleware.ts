import { NextRequest, NextResponse } from "next/server";

// admin は環境変数のBasic認証で保護(第9章)。
export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASS || "claimsolve";

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const [u, p] = decoded.split(":");
      if (u === user && p === pass) return NextResponse.next();
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ClaimSolve Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
