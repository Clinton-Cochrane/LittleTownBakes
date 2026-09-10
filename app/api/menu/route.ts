import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import menuFixture from "@/fixtures/menu.json";
import type { Category, Item, MenuResponse } from "@/lib/menuCatalog";
import { getQuantityOnHand, type ProductInventory } from "@/lib/inventory";

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

function shouldUseMenuFixture({
	nodeEnv = process.env.NODE_ENV,
	menuDataSource = process.env.MENU_DATA_SOURCE,
}: {
	nodeEnv?: string;
	menuDataSource?: string;
} = {}): boolean {
	return nodeEnv !== "production" && menuDataSource === "fixture";
}

export async function GET() {
	try {
		if (shouldUseMenuFixture()) {
			return NextResponse.json(menuFixture satisfies MenuResponse);
		}

		const supabase = getSupabaseAdmin();
		const [categoriesResult, productsResult, inventoryResult] = await Promise.all([
			supabase.from("categories").select("id, name, sort_order"),
			supabase
				.from("products")
				.select("id, category_id, name, description, price_cents, image, max_per_order, is_archived, sort_order"),
			supabase.from("product_inventory").select("product_id, quantity_on_hand"),
		]);

		if (categoriesResult.error || productsResult.error || inventoryResult.error) {
			throw new Error(
				categoriesResult.error?.message
					?? productsResult.error?.message
					?? inventoryResult.error?.message
					?? "Catalog query failed"
			);
		}

		const categories = ((categoriesResult.data ?? []) as CategoryRow[])
			.map(mapCategory)
			.sort(compareCatalogEntries);
		const catalogItems = ((productsResult.data ?? []) as ProductRow[])
			.map(mapProduct)
			.sort(compareCatalogEntries);
		const inventory = (inventoryResult.data ?? []) as ProductInventory[];

		const enrichedItems = catalogItems.map((item) => {
			const remaining = getQuantityOnHand(inventory, item.id);
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
		console.error("[api/menu] Failed to load the Supabase catalog", error);
		return NextResponse.json(
			{
				error: "Menu is currently unavailable. Please try again later.",
				code: "MENU_SOURCE_UNAVAILABLE",
			},
			{ status: 503 }
		);
	}
}
