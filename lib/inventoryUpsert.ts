import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ProductInventory } from "@/lib/inventory";

export type SetProductInventoryInput = {
	product_id: string;
	quantity_on_hand: number;
};

export type InventoryMutationResult =
	| { ok: true; data: ProductInventory }
	| { ok: false; status: 400 | 404 | 409; error: string };

export async function setProductInventory(
	row: SetProductInventoryInput
): Promise<{ ok: true; data: ProductInventory } | { ok: false; error: string }> {
	const { data, error } = await supabaseAdmin
		.from("product_inventory")
		.update({ quantity_on_hand: row.quantity_on_hand })
		.eq("product_id", row.product_id)
		.select()
		.maybeSingle();

	if (error) return { ok: false, error: error.message };
	if (!data) return { ok: false, error: `Product ${row.product_id}: inventory state is missing` };
	return { ok: true, data: data as ProductInventory };
}

export async function adjustProductInventory(
	productId: string,
	delta: number
): Promise<InventoryMutationResult> {
	const { data, error } = await supabaseAdmin.rpc("adjust_product_inventory", {
		p_product_id: productId,
		p_delta: delta,
	});

	if (!error && typeof data === "number") {
		return {
			ok: true,
			data: { product_id: productId, quantity_on_hand: data },
		};
	}
	if (error?.message.includes("INVENTORY_NOT_FOUND")) {
		return { ok: false, status: 404, error: "That product could not be found." };
	}
	if (error?.message.includes("INVENTORY_OUT_OF_RANGE")) {
		return { ok: false, status: 409, error: "There is not enough available to make that change." };
	}

	console.error("[inventory] atomic adjustment failed", error);
	return { ok: false, status: 400, error: "Stock could not be updated. Please try again." };
}
