import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LOCAL_ADMIN_COOKIE, LOCAL_ADMIN_COOKIE_VALUE } from "@/lib/localMode";

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
		vi.stubEnv("LOCAL_DATA_SOURCE", "");
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
	});

	afterEach(() => vi.unstubAllEnvs());

	it("protects local admin pages with the local-only cookie without calling Supabase", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("LOCAL_DATA_SOURCE", "json");
		const anonymous = await middleware(new NextRequest("http://localhost/admin/orders"));
		expect(anonymous.headers.get("location")).toBe("http://localhost/admin/login");

		const request = new NextRequest("http://localhost/admin/orders");
		request.cookies.set(LOCAL_ADMIN_COOKIE, LOCAL_ADMIN_COOKIE_VALUE);
		const authenticated = await middleware(request);
		expect(authenticated.headers.get("location")).toBeNull();
		expect(mockGetClaims).not.toHaveBeenCalled();
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

	it.each(["/admin/orders", "/admin/menu", "/admin/inventory", "/admin/availability", "/admin/menu?view=past"])(
		"redirects unauthenticated protected route %s to login",
		async (pathname) => {
			mockGetClaims.mockResolvedValue({ data: null, error: null });
			const response = await middleware(new NextRequest(`http://localhost${pathname}`));
			expect(response.status).toBe(307);
			expect(response.headers.get("location")).toBe("http://localhost/admin/login");
		},
	);

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
