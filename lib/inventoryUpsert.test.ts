import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/lib/supabaseAdmin", () => ({
	supabaseAdmin: { rpc: mockRpc },
}));

import { adjustProductInventory } from "./inventoryUpsert";

describe("adjustProductInventory", () => {
	beforeEach(() => vi.clearAllMocks());

	it("delegates the delta to the atomic database function", async () => {
		mockRpc.mockResolvedValue({ data: 6, error: null });

		await expect(adjustProductInventory("cake", 1)).resolves.toEqual({
			ok: true,
			data: { product_id: "cake", quantity_on_hand: 6 },
		});
		expect(mockRpc).toHaveBeenCalledWith("adjust_product_inventory", {
			p_product_id: "cake",
			p_delta: 1,
		});
	});

	it("maps a below-zero database rejection to a safe baker-facing message", async () => {
		mockRpc.mockResolvedValue({
			data: null,
			error: { message: "INVENTORY_OUT_OF_RANGE: internal detail" },
		});

		await expect(adjustProductInventory("cake", -1)).resolves.toEqual({
			ok: false,
			status: 409,
			error: "There is not enough available to make that change.",
		});
	});
});
