/**
 * Upsert a single inventory slot (same behavior as POST /api/admin/inventory).
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { InventorySlot } from "@/lib/inventory";

export type UpsertInventoryInput = {
	item_id: string;
	period_type: "week" | "month";
	period_start: string;
	quantity_available: number;
};

export async function upsertInventorySlot(
	row: UpsertInventoryInput
): Promise<{ ok: true; data: InventorySlot; created: boolean } | { ok: false; error: string }> {
	const { item_id, period_type, period_start } = row;
	const qty = Math.max(0, Math.floor(Number(row.quantity_available)));

	const { data: existing } = await supabaseAdmin
		.from("inventory_slots")
		.select("id")
		.eq("item_id", item_id)
		.eq("period_type", period_type)
		.eq("period_start", period_start)
		.maybeSingle();

	if (existing) {
		const { data, error } = await supabaseAdmin
			.from("inventory_slots")
			.update({ quantity_available: qty })
			.eq("id", existing.id)
			.select()
			.single();
		if (error) return { ok: false, error: error.message };
		if (!data) return { ok: false, error: "Update returned no row" };
		return { ok: true, data: data as InventorySlot, created: false };
	}

	const { data, error } = await supabaseAdmin
		.from("inventory_slots")
		.insert({ item_id, period_type, period_start, quantity_available: qty, quantity_sold: 0 })
		.select()
		.single();

	if (error) return { ok: false, error: error.message };
	if (!data) return { ok: false, error: "Insert returned no row" };
	return { ok: true, data: data as InventorySlot, created: true };
}
