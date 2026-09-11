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
		.upsert(row, { onConflict: "product_id" })
		.select()
		.single();

	if (error) return { ok: false, error: error.message };
	return { ok: true, data: data as ProductInventory };
}

export async function adjustProductInventory(
	productId: string,
	delta: number
): Promise<InventoryMutationResult> {
	const adjustment = {
		p_product_id: productId,
		p_delta: delta,
	};
	let { data, error } = await supabaseAdmin.rpc("adjust_product_inventory", adjustment);

	if (error?.message.includes("INVENTORY_NOT_FOUND")) {
		const initialized = await supabaseAdmin
			.from("product_inventory")
			.upsert({ product_id: productId, quantity_on_hand: 0 }, { onConflict: "product_id", ignoreDuplicates: true });
		if (!initialized.error) ({ data, error } = await supabaseAdmin.rpc("adjust_product_inventory", adjustment));
	}

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
