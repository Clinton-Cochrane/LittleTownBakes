/**
 * In-memory rate limiter for API routes.
 * Uses fixed-window algorithm keyed by client IP.
 *
 * Note: For serverless/multi-instance production, use Redis (e.g. Upstash)
 * or similar distributed store. This works for single-instance deployments.
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // per window per IP

type WindowEntry = { count: number; resetAt: number };

const store = new Map<string, WindowEntry>();

function getClientIp(req: Request): string {
	const forwarded = req.headers.get("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}
	const realIp = req.headers.get("x-real-ip");
	if (realIp) return realIp;
	return "unknown";
}

/**
 * Check if the request should be rate limited.
 * Returns null if allowed, or a Response to return (429) if limited.
 */
export function checkRateLimit(req: Request): Response | null {
	const ip = getClientIp(req);
	const now = Date.now();
	let entry = store.get(ip);

	if (!entry) {
		store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
		return null;
	}

	if (now >= entry.resetAt) {
		entry = { count: 1, resetAt: now + WINDOW_MS };
		store.set(ip, entry);
		return null;
	}

	entry.count++;
	if (entry.count > MAX_REQUESTS) {
		return new Response(
			JSON.stringify({ error: "Too many requests. Please try again later." }),
			{
				status: 429,
				headers: {
					"Content-Type": "application/json",
					"Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
				},
			}
		);
	}

	return null;
}
