import { NextRequest, NextResponse } from "next/server";

/** Returns 401 response if `x-admin-key` does not match `ADMIN_KEY`, else null. */
export function requireAdmin(req: NextRequest): NextResponse | null {
	const key = (req.headers.get("x-admin-key") ?? "").trim();
	const expectedKey = (process.env.ADMIN_KEY ?? "").trim();
	if (!expectedKey || key !== expectedKey) return new NextResponse("Unauthorized", { status: 401 });
	return null;
}
