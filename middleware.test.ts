import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetClaims } = vi.hoisted(() => ({
	mockGetClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
	createServerClient: vi.fn(() => ({ auth: { getClaims: mockGetClaims } })),
}));

import { middleware } from "./middleware";

describe("admin middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
	});

	it("does not trap the public admin login page", async () => {
		mockGetClaims.mockResolvedValue({ data: null, error: null });

		const response = await middleware(new NextRequest("http://localhost/admin/login"));

		expect(response.headers.get("location")).toBeNull();
		expect(response.headers.get("x-middleware-next")).toBe("1");
	});

	it("redirects an unauthenticated admin page request to login", async () => {
		mockGetClaims.mockResolvedValue({ data: null, error: null });

		const response = await middleware(new NextRequest("http://localhost/admin/orders"));

		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("http://localhost/admin/login");
	});

	it("redirects an authenticated non-admin", async () => {
		mockGetClaims.mockResolvedValue({
			data: { claims: { sub: "user-1", app_metadata: { role: "staff" } } },
			error: null,
		});

		const response = await middleware(new NextRequest("http://localhost/admin/orders"));

		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("http://localhost/admin/login?error=forbidden");
	});

	it("allows an authenticated admin to proceed", async () => {
		mockGetClaims.mockResolvedValue({
			data: { claims: { sub: "admin-1", app_metadata: { role: "admin" } } },
			error: null,
		});

		const response = await middleware(new NextRequest("http://localhost/admin/orders"));

		expect(response.headers.get("location")).toBeNull();
		expect(response.headers.get("x-middleware-next")).toBe("1");
	});
});
