import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Category, Item } from "@/lib/menuCatalog";
import {
	getWeekStart,
	getMonthStart,
	getRemaining,
	findRelevantSlot,
	type InventorySlot,
} from "@/lib/inventory";

type CategoryRow = {
	id: string;
	name: string;
	sort_order: number;
};

type ProductRow = {
	id: string;
	category_id: string;
	name: string;
	description: string | null;
	price_cents: number;
	image: string | null;
	max_per_order: number;
	is_archived: boolean;
	sort_order: number;
};

function compareCatalogEntries(
	a: { id: string; name: string; sortOrder?: number },
	b: { id: string; name: string; sortOrder?: number }
): number {
	const sortOrderDifference = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
	if (sortOrderDifference !== 0) return sortOrderDifference;

	const nameDifference = a.name.localeCompare(b.name);
	if (nameDifference !== 0) return nameDifference;

	return a.id.localeCompare(b.id);
}

function mapCategory(row: CategoryRow): Category {
	return {
		id: row.id,
		name: row.name,
		sortOrder: row.sort_order,
	};
}

function mapProduct(row: ProductRow): Item {
	return {
		id: row.id,
		name: row.name,
		categoryId: row.category_id,
		description: row.description ?? undefined,
		basePrice: row.price_cents / 100,
		image: row.image ?? undefined,
		maxPerOrder: row.max_per_order,
		isArchived: row.is_archived,
		sortOrder: row.sort_order,
		availability: { inStock: false },
	};
}

export async function GET() {
	try {
		const supabase = getSupabaseAdmin();
		const [categoriesResult, productsResult, slotsResult] = await Promise.all([
			supabase.from("categories").select("id, name, sort_order"),
			supabase
				.from("products")
				.select("id, category_id, name, description, price_cents, image, max_per_order, is_archived, sort_order"),
			supabase.from("inventory_slots").select("*"),
		]);

		if (categoriesResult.error || productsResult.error) {
			throw new Error(
				categoriesResult.error?.message ?? productsResult.error?.message ?? "Catalog query failed"
			);
		}

		const categories = ((categoriesResult.data ?? []) as CategoryRow[])
			.map(mapCategory)
			.sort(compareCatalogEntries);
		const catalogItems = ((productsResult.data ?? []) as ProductRow[])
			.map(mapProduct)
			.sort(compareCatalogEntries);
		const inventorySlots = slotsResult.error ? [] : ((slotsResult.data ?? []) as InventorySlot[]);
		const now = new Date();
		const weekStart = getWeekStart(now);
		const monthStart = getMonthStart(now);

		const relevantSlots = inventorySlots.filter(
			(slot) =>
				(slot.period_type === "week" && slot.period_start === weekStart) ||
				(slot.period_type === "month" && slot.period_start === monthStart)
		);

		const enrichedItems = catalogItems.map((item) => {
			const slot = findRelevantSlot(relevantSlots, item.id, now);
			const remaining = slot ? getRemaining(slot) : 0;
			const available = remaining > 0;

			return {
				...item,
				remaining,
				available,
				availability: { inStock: available },
			};
		});

		return NextResponse.json({
			categories,
			items: enrichedItems.filter((item) => !item.isArchived),
			archivedItems: enrichedItems.filter((item) => item.isArchived),
		});
	} catch (error) {
		console.error("[api/menu]", error);
		return NextResponse.json({ error: "Menu unavailable" }, { status: 500 });
	}
}
