import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { MenuCatalog, Item } from "@/lib/menuCatalog";
import {
	getWeekStart,
	getMonthStart,
	getRemaining,
	findRelevantSlot,
	type InventorySlot,
} from "@/lib/inventory";

/** Load menu.json from public folder */
async function loadMenuCatalog(): Promise<MenuCatalog> {
	const path = join(process.cwd(), "public", "menu.json");
	const raw = await readFile(path, "utf-8");
	const data = JSON.parse(raw) as Partial<MenuCatalog>;
	const categories = Array.isArray(data.categories) ? data.categories : [];
	const items = Array.isArray(data.items) ? data.items : [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const normalizedItems: Item[] = items.map((it: any) => ({
		...it,
		id: String(it.id ?? "").trim(),
		name: String(it.name ?? "").trim(),
		categoryId: String(it.categoryId ?? "").trim(),
		basePrice: typeof it.basePrice === "number" ? it.basePrice : Number(it.basePrice ?? 0),
		availability: { inStock: Boolean(it?.availability?.inStock) },
		isArchived: Boolean(it?.isArchived),
	})).filter((it: Item) => it.id && it.name && it.categoryId);
	return { categories, items: normalizedItems };
}

export async function GET() {
	try {
		const [catalog, { data: slots, error: slotsError }] = await Promise.all([
			loadMenuCatalog(),
			supabaseAdmin.from("inventory_slots").select("*"),
		]);

		const inventorySlots = slotsError ? [] : ((slots ?? []) as InventorySlot[]);
		const now = new Date();
		const weekStart = getWeekStart(now);
		const monthStart = getMonthStart(now);

		// Filter slots to current week and month only
		const relevantSlots = inventorySlots.filter(
			(s) =>
				(s.period_type === "week" && s.period_start === weekStart) ||
				(s.period_type === "month" && s.period_start === monthStart)
		);

		const enrichedItems = catalog.items.map((item) => {
			const slot = findRelevantSlot(relevantSlots, item.id, now);
			if (slot) {
				const remaining = getRemaining(slot);
				return {
					...item,
					remaining,
					available: remaining > 0,
					availability: { inStock: remaining > 0 },
				};
			}
			// No slot: use JSON inStock
			return {
				...item,
				remaining: undefined,
				available: item.availability.inStock,
			};
		});

		// Exclude archived from main menu; include them for "Request a flavor"
		const items = enrichedItems.filter((i) => !(i as { isArchived?: boolean }).isArchived);
		const archivedItems = enrichedItems.filter((i) => (i as { isArchived?: boolean }).isArchived);

		return NextResponse.json({
			categories: catalog.categories,
			items,
			archivedItems,
		});
	} catch (e) {
		console.error("[api/menu]", e);
		return NextResponse.json({ error: "Menu unavailable" }, { status: 500 });
	}
}
