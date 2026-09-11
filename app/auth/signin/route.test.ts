import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
	createClient: vi.fn(async () => ({ auth: { signInWithPassword: mockSignIn } })),
}));

import { LOCAL_ADMIN_COOKIE } from "@/lib/localMode";
import { POST } from "./route";

function request(email: string, password: string) {
	const body = new URLSearchParams({ email, password });
	return new NextRequest("http://localhost/auth/signin", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
}

describe("POST /auth/signin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("LOCAL_DATA_SOURCE", "json");
	});

	afterEach(() => vi.unstubAllEnvs());

	it("sets the local-only admin cookie for the documented credentials", async () => {
		const response = await POST(request("root@local.test", "toor"));
		expect(response.status).toBe(303);
		expect(response.headers.get("location")).toBe("http://localhost/admin/orders");
		expect(response.cookies.get(LOCAL_ADMIN_COOKIE)?.value).toBe("authenticated");
		expect(mockSignIn).not.toHaveBeenCalled();
	});

	it("rejects incorrect local credentials without calling Supabase", async () => {
		const response = await POST(request("root@local.test", "wrong"));
		expect(response.headers.get("location")).toBe("http://localhost/admin/login?error=invalid");
		expect(response.cookies.get(LOCAL_ADMIN_COOKIE)).toBeUndefined();
		expect(mockSignIn).not.toHaveBeenCalled();
	});

	it("uses Supabase when local mode is disabled", async () => {
		vi.stubEnv("LOCAL_DATA_SOURCE", "");
		mockSignIn.mockResolvedValue({ error: null });
		const response = await POST(request("owner@example.com", "secret"));
		expect(response.headers.get("location")).toBe("http://localhost/admin/orders");
		expect(mockSignIn).toHaveBeenCalledWith({ email: "owner@example.com", password: "secret" });
	});
});
