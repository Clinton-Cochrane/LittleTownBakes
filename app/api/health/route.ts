import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Health checks for deployment platforms (Vercel, etc.).
 *
 * - **Liveness:** `GET /api/health` — returns 200 when the app process is up (no DB call).
 * - **Readiness:** `GET /api/health?ready=1` — verifies Supabase credentials and that the
 *   `orders` table is reachable (503 if misconfigured or DB error). Use after deploy to
 *   confirm env vars and migrations.
 */
export async function GET(req: NextRequest) {
	const timestamp = new Date().toISOString();
	const ready = req.nextUrl.searchParams.get("ready") === "1";

	if (!ready) {
		return NextResponse.json({ status: "ok", timestamp });
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
	if (!url || !key || key === "placeholder") {
		return NextResponse.json(
			{
				status: "not_ready",
				timestamp,
				checks: { supabase: "missing_or_invalid_env" },
			},
			{ status: 503 }
		);
	}

	const supabase = getSupabaseAdmin();
	const { error } = await supabase.from("orders").select("id").limit(1);
	if (error) {
		return NextResponse.json(
			{
				status: "not_ready",
				timestamp,
				checks: { supabase: error.message },
			},
			{ status: 503 }
		);
	}

	return NextResponse.json({
		status: "ok",
		timestamp,
		checks: { supabase: "ok" },
	});
}
