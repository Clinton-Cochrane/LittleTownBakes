import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ProductInventory } from "@/lib/inventory";

export type SetProductInventoryInput = {
	product_id: string;
	quantity_on_hand: number;
};

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
