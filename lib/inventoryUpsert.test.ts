import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc, mockFrom } = vi.hoisted(() => ({ mockRpc: vi.fn(), mockFrom: vi.fn() }));

vi.mock("@/lib/supabaseAdmin", () => ({
	supabaseAdmin: { rpc: mockRpc, from: mockFrom },
}));

import { adjustProductInventory, setProductInventory } from "./inventoryUpsert";

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

	it("upserts an exact quantity so a missing inventory row is created", async () => {
		const single = vi.fn().mockResolvedValue({
			data: { product_id: "new-cake", quantity_on_hand: 8 },
			error: null,
		});
		const select = vi.fn(() => ({ single }));
		const upsert = vi.fn(() => ({ select }));
		mockFrom.mockReturnValue({ upsert });

		await expect(setProductInventory({ product_id: "new-cake", quantity_on_hand: 8 })).resolves.toEqual({
			ok: true,
			data: { product_id: "new-cake", quantity_on_hand: 8 },
		});
		expect(mockFrom).toHaveBeenCalledWith("product_inventory");
		expect(upsert).toHaveBeenCalledWith(
			{ product_id: "new-cake", quantity_on_hand: 8 },
			{ onConflict: "product_id" },
		);
	});

	it("initializes a missing row at zero and retries the atomic adjustment", async () => {
		mockRpc
			.mockResolvedValueOnce({ data: null, error: { message: "INVENTORY_NOT_FOUND" } })
			.mockResolvedValueOnce({ data: 1, error: null });
		const upsert = vi.fn().mockResolvedValue({ error: null });
		mockFrom.mockReturnValue({ upsert });

		await expect(adjustProductInventory("new-cake", 1)).resolves.toEqual({
			ok: true,
			data: { product_id: "new-cake", quantity_on_hand: 1 },
		});
		expect(upsert).toHaveBeenCalledWith(
			{ product_id: "new-cake", quantity_on_hand: 0 },
			{ onConflict: "product_id", ignoreDuplicates: true },
		);
		expect(mockRpc).toHaveBeenCalledTimes(2);
	});
});
