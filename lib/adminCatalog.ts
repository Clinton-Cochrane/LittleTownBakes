import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

export class CatalogRequestError extends Error {
	constructor(public readonly status: 400 | 404 | 409 | 500, message: string) {
		super(message);
		this.name = "CatalogRequestError";
	}
}

type ProductInput = {
	name: string;
	description: string;
	priceCents: number;
	categoryId: string;
	maxPerOrder: number;
	image: string | null;
};

type ProductPatch = Partial<ProductInput>;
type CategoryInput = { name: string };

type ProductRow = {
	id: string;
	category_id: string;
	name: string;
	description: string;
	price_cents: number;
	image: string | null;
	max_per_order: number;
	is_archived: boolean;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

type CategoryRow = {
	id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

type InventoryRow = { product_id: string; quantity_on_hand: number };

const productFields = "id, category_id, name, description, price_cents, image, max_per_order, is_archived, sort_order, created_at, updated_at";
const categoryFields = "id, name, sort_order, created_at, updated_at";

function objectBody(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new CatalogRequestError(400, "Request body must be an object");
	}
	return value as Record<string, unknown>;
}

function rejectUnknownFields(body: Record<string, unknown>, allowed: readonly string[]) {
	const unknown = Object.keys(body).find((key) => !allowed.includes(key));
	if (unknown) throw new CatalogRequestError(400, `Unknown or immutable field: ${unknown}`);
}

function nonblankString(value: unknown, field: string): string {
	if (typeof value !== "string" || !value.trim()) {
		throw new CatalogRequestError(400, `${field} must be a nonblank string`);
	}
	return value.trim();
}

function description(value: unknown): string {
	if (typeof value !== "string") throw new CatalogRequestError(400, "description must be a string");
	return value.trim();
}

function price(value: unknown): number {
	if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > POSTGRES_INTEGER_MAX) {
		throw new CatalogRequestError(400, "priceCents must be a non-negative safe integer no greater than 2147483647");
	}
	return value as number;
}

function maxPerOrder(value: unknown): number {
	if (!Number.isSafeInteger(value) || (value as number) <= 0 || (value as number) > POSTGRES_INTEGER_MAX) {
		throw new CatalogRequestError(400, "maxPerOrder must be a positive safe integer no greater than 2147483647");
	}
	return value as number;
}

function imageReference(value: unknown): string | null {
	if (value === null) return null;
	if (typeof value !== "string" || !value.trim()) {
		throw new CatalogRequestError(400, "image must be a nonblank string or null");
	}
	return value.trim();
}

export function parseProductCreate(value: unknown): ProductInput {
	const body = objectBody(value);
	rejectUnknownFields(body, ["name", "description", "priceCents", "categoryId", "maxPerOrder", "image"]);
	return {
		name: nonblankString(body.name, "name"),
		description: body.description === undefined ? "" : description(body.description),
		priceCents: price(body.priceCents),
		categoryId: nonblankString(body.categoryId, "categoryId"),
		maxPerOrder: body.maxPerOrder === undefined ? 1 : maxPerOrder(body.maxPerOrder),
		image: body.image === undefined ? null : imageReference(body.image),
	};
}

export function parseProductPatch(value: unknown): ProductPatch {
	const body = objectBody(value);
	rejectUnknownFields(body, ["name", "description", "priceCents", "categoryId", "maxPerOrder", "image"]);
	if (Object.keys(body).length === 0) throw new CatalogRequestError(400, "At least one editable field is required");
	const result: ProductPatch = {};
	if (body.name !== undefined) result.name = nonblankString(body.name, "name");
	if (body.description !== undefined) result.description = description(body.description);
	if (body.priceCents !== undefined) result.priceCents = price(body.priceCents);
	if (body.categoryId !== undefined) result.categoryId = nonblankString(body.categoryId, "categoryId");
	if (body.maxPerOrder !== undefined) result.maxPerOrder = maxPerOrder(body.maxPerOrder);
	if (body.image !== undefined) result.image = imageReference(body.image);
	return result;
}

export function parseCategoryCreate(value: unknown): CategoryInput {
	const body = objectBody(value);
	rejectUnknownFields(body, ["name"]);
	return { name: nonblankString(body.name, "name") };
}

export function parseCategoryPatch(value: unknown): CategoryInput {
	return parseCategoryCreate(value);
}

function orderedIds(value: unknown, field: string): string[] {
	if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) {
		throw new CatalogRequestError(400, `${field} must contain only nonblank strings`);
	}
	const ids = value.map((id) => (id as string).trim());
	if (new Set(ids).size !== ids.length) {
		throw new CatalogRequestError(400, `${field} must not contain duplicates`);
	}
	return ids;
}

export function parseProductReorder(value: unknown): { categoryId: string; productIds: string[] } {
	const body = objectBody(value);
	rejectUnknownFields(body, ["categoryId", "productIds"]);
	return {
		categoryId: nonblankString(body.categoryId, "categoryId"),
		productIds: orderedIds(body.productIds, "productIds"),
	};
}

export function parseCategoryReorder(value: unknown): { categoryIds: string[] } {
	const body = objectBody(value);
	rejectUnknownFields(body, ["categoryIds"]);
	return { categoryIds: orderedIds(body.categoryIds, "categoryIds") };
}

function mapCategory(row: CategoryRow) {
	return {
		id: row.id,
		name: row.name,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapProduct(row: ProductRow, quantityOnHand: number) {
	return {
		id: row.id,
		categoryId: row.category_id,
		name: row.name,
		description: row.description,
		priceCents: row.price_cents,
		image: row.image,
		maxPerOrder: row.max_per_order,
		isArchived: row.is_archived,
		sortOrder: row.sort_order,
		quantityOnHand,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function databaseFailure(operation: string, error: unknown): never {
	console.error(`[admin catalog] ${operation} failed`, error);
	throw new CatalogRequestError(500, "Catalog operation failed");
}

function uniquenessFailure(operation: string, error: { code?: string } | null): never {
	if (error?.code === "23505") throw new CatalogRequestError(409, "Category name already exists");
	return databaseFailure(operation, error);
}

async function requireCategory(categoryId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from("categories")
		.select("id")
		.eq("id", categoryId)
		.maybeSingle();
	if (error) databaseFailure("category lookup", error);
	if (!data) throw new CatalogRequestError(404, "Category not found");
}

async function nextSortOrder(table: "categories" | "products", categoryId?: string): Promise<number> {
	let query = getSupabaseAdmin().from(table).select("sort_order");
	if (table === "products" && categoryId) query = query.eq("category_id", categoryId);
	const { data, error } = await query.order("sort_order", { ascending: false }).limit(1).maybeSingle();
	if (error) databaseFailure(`${table} position lookup`, error);
	return ((data as { sort_order?: number } | null)?.sort_order ?? 0) + 10;
}

export async function listCategories() {
	const { data, error } = await getSupabaseAdmin()
		.from("categories")
		.select(categoryFields)
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true })
		.order("id", { ascending: true });
	if (error) databaseFailure("list categories", error);
	return ((data ?? []) as CategoryRow[]).map(mapCategory);
}

export async function createCategory(input: CategoryInput, generateId: () => string = randomUUID) {
	const sortOrder = await nextSortOrder("categories");
	const { data, error } = await getSupabaseAdmin()
		.from("categories")
		.insert({ id: generateId(), name: input.name, sort_order: sortOrder })
		.select(categoryFields)
		.single();
	if (error || !data) uniquenessFailure("create category", error);
	return mapCategory(data as CategoryRow);
}

export async function updateCategory(id: string, input: CategoryInput) {
	const { data, error } = await getSupabaseAdmin()
		.from("categories")
		.update({ name: input.name })
		.eq("id", id)
		.select(categoryFields)
		.maybeSingle();
	if (error) uniquenessFailure("update category", error);
	if (!data) throw new CatalogRequestError(404, "Category not found");
	return mapCategory(data as CategoryRow);
}

export async function listProducts() {
	const supabase = getSupabaseAdmin();
	const [productsResult, inventoryResult] = await Promise.all([
		supabase.from("products").select(productFields).order("category_id").order("sort_order").order("name").order("id"),
		supabase.from("product_inventory").select("product_id, quantity_on_hand"),
	]);
	if (productsResult.error) databaseFailure("list products", productsResult.error);
	if (inventoryResult.error) databaseFailure("list product inventory", inventoryResult.error);
	const inventory = new Map(((inventoryResult.data ?? []) as InventoryRow[]).map((row) => [row.product_id, row.quantity_on_hand]));
	return ((productsResult.data ?? []) as ProductRow[]).map((row) => mapProduct(row, inventory.get(row.id) ?? 0));
}

async function getProduct(id: string) {
	const supabase = getSupabaseAdmin();
	const [productResult, inventoryResult] = await Promise.all([
		supabase.from("products").select(productFields).eq("id", id).maybeSingle(),
		supabase.from("product_inventory").select("quantity_on_hand").eq("product_id", id).maybeSingle(),
	]);
	if (productResult.error) databaseFailure("product lookup", productResult.error);
	if (!productResult.data) throw new CatalogRequestError(404, "Product not found");
	if (inventoryResult.error) databaseFailure("product inventory lookup", inventoryResult.error);
	return mapProduct(productResult.data as ProductRow, (inventoryResult.data as { quantity_on_hand?: number } | null)?.quantity_on_hand ?? 0);
}

export async function createProduct(input: ProductInput, generateId: () => string = randomUUID) {
	await requireCategory(input.categoryId);
	const sortOrder = await nextSortOrder("products", input.categoryId);
	const id = generateId();
	const { error } = await getSupabaseAdmin().from("products").insert({
		id,
		category_id: input.categoryId,
		name: input.name,
		description: input.description,
		price_cents: input.priceCents,
		image: input.image,
		max_per_order: input.maxPerOrder,
		is_archived: false,
		sort_order: sortOrder,
	});
	if (error) databaseFailure("create product", error);
	return getProduct(id);
}

export async function updateProduct(id: string, input: ProductPatch) {
	const { data: existing, error: lookupError } = await getSupabaseAdmin()
		.from("products")
		.select("id, category_id")
		.eq("id", id)
		.maybeSingle();
	if (lookupError) databaseFailure("product lookup", lookupError);
	if (!existing) throw new CatalogRequestError(404, "Product not found");

	const update: Record<string, unknown> = {};
	if (input.name !== undefined) update.name = input.name;
	if (input.description !== undefined) update.description = input.description;
	if (input.priceCents !== undefined) update.price_cents = input.priceCents;
	if (input.maxPerOrder !== undefined) update.max_per_order = input.maxPerOrder;
	if (input.image !== undefined) update.image = input.image;
	if (input.categoryId !== undefined && input.categoryId !== existing.category_id) {
		await requireCategory(input.categoryId);
		update.category_id = input.categoryId;
		update.sort_order = await nextSortOrder("products", input.categoryId);
	}

	if (Object.keys(update).length > 0) {
		const { error } = await getSupabaseAdmin().from("products").update(update).eq("id", id);
		if (error) databaseFailure("update product", error);
	}
	return getProduct(id);
}

export async function setProductArchived(id: string, isArchived: boolean) {
	const { data, error } = await getSupabaseAdmin()
		.from("products")
		.update({ is_archived: isArchived })
		.eq("id", id)
		.select("id")
		.maybeSingle();
	if (error) databaseFailure(isArchived ? "archive product" : "unarchive product", error);
	if (!data) throw new CatalogRequestError(404, "Product not found");
	return getProduct(id);
}

function reorderFailure(error: { message?: string } | null): never {
	if (error?.message?.includes("CATALOG_CATEGORY_NOT_FOUND")) throw new CatalogRequestError(404, "Category not found");
	if (error?.message?.includes("CATALOG_INVALID_REORDER")) throw new CatalogRequestError(400, "Reorder list must contain exactly the applicable IDs");
	return databaseFailure("reorder", error);
}

export async function reorderProducts(categoryId: string, productIds: string[]) {
	const { error } = await getSupabaseAdmin().rpc("reorder_category_products", {
		p_category_id: categoryId,
		p_product_ids: productIds,
	});
	if (error) reorderFailure(error);
	return listProducts().then((products) => products.filter((product) => product.categoryId === categoryId));
}

export async function reorderCategories(categoryIds: string[]) {
	const { error } = await getSupabaseAdmin().rpc("reorder_catalog_categories", {
		p_category_ids: categoryIds,
	});
	if (error) reorderFailure(error);
	return listCategories();
}
