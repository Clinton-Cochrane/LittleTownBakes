import { NextResponse } from "next/server";

/**
 * Health check endpoint for deployment platforms (Vercel, etc.).
 * Returns 200 when the app is running.
 */
export async function GET() {
	return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
