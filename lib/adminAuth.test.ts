import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetClaims } = vi.hoisted(() => ({
	mockGetClaims: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
	createClient: vi.fn(async () => ({ auth: { getClaims: mockGetClaims } })),
}));

import { requireAdmin } from "./adminAuth";

describe("requireAdmin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 for an anonymous request", async () => {
		mockGetClaims.mockResolvedValue({ data: null, error: null });

		const result = await requireAdmin();

		expect(result.authorized).toBe(false);
		if (!result.authorized) expect(result.response.status).toBe(401);
	});

	it("returns 401 for invalid or expired authentication", async () => {
		mockGetClaims.mockResolvedValue({ data: null, error: new Error("JWT expired") });

		const result = await requireAdmin();

		expect(result.authorized).toBe(false);
		if (!result.authorized) expect(result.response.status).toBe(401);
	});

	it("returns 403 for an authenticated non-admin", async () => {
		mockGetClaims.mockResolvedValue({
			data: { claims: { sub: "user-1", email: "staff@example.com", app_metadata: { role: "staff" } } },
			error: null,
		});

		const result = await requireAdmin();

		expect(result.authorized).toBe(false);
		if (!result.authorized) expect(result.response.status).toBe(403);
	});

	it("returns the verified identity for an admin", async () => {
		mockGetClaims.mockResolvedValue({
			data: { claims: { sub: "admin-1", email: "owner@example.com", app_metadata: { role: "admin" } } },
			error: null,
		});

		const result = await requireAdmin();

		expect(result).toEqual({
			authorized: true,
			admin: { id: "admin-1", email: "owner@example.com" },
		});
	});
});
