import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authState = vi.hoisted(() => ({ signedIn: true }));
const { mockSignOut } = vi.hoisted(() => ({
	mockSignOut: vi.fn(async () => {
		authState.signedIn = false;
		return { error: null };
	}),
}));

vi.mock("@/lib/supabase/server", () => ({
	createClient: vi.fn(async () => ({
		auth: {
			signOut: mockSignOut,
			getClaims: vi.fn(async () =>
				authState.signedIn
					? {
						data: { claims: { sub: "admin-1", app_metadata: { role: "admin" } } },
						error: null,
					}
					: { data: null, error: null }
			),
		},
	})),
}));

import { requireAdmin } from "@/lib/adminAuth";
import { POST } from "./route";

describe("POST /auth/signout", () => {
	beforeEach(() => {
		authState.signedIn = true;
		vi.clearAllMocks();
	});

	it("signs out, redirects to login, and leaves protected requests unauthorized", async () => {
		expect((await requireAdmin()).authorized).toBe(true);

		const response = await POST(new NextRequest("http://localhost/auth/signout", { method: "POST" }));

		expect(mockSignOut).toHaveBeenCalledOnce();
		expect(response.status).toBe(303);
		expect(response.headers.get("location")).toBe("http://localhost/admin/login");
		const protectedResult = await requireAdmin();
		expect(protectedResult.authorized).toBe(false);
		if (!protectedResult.authorized) expect(protectedResult.response.status).toBe(401);
	});
});
