import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MenuResponse } from "./menuCatalog";
import type { AdminOrderRecord, FulfillmentStatus, OrderRecord, PaymentMethod } from "./orderTypes";

export type LocalCategoryRow = {
	id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type LocalProductRow = {
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

export type LocalInventoryRow = { product_id: string; quantity_on_hand: number };
export type LocalPickupWindowRow = {
	id: string;
	start_at: string;
	end_at: string;
	enabled: boolean;
	created_at: string;
	updated_at: string;
};

export type LocalOrderRow = {
	id: string;
	tracking_token: string;
	created_at: string;
	status: FulfillmentStatus;
	payload: OrderRecord;
};

export type LocalData = {
	categories: LocalCategoryRow[];
	products: LocalProductRow[];
	inventory: LocalInventoryRow[];
	pickupWindows: LocalPickupWindowRow[];
	orders: LocalOrderRow[];
	demandSignals?: Record<string, number>;
};

type LocalOrderInput = {
	customer: OrderRecord["customer"];
	payment: { method: PaymentMethod; venmoUser?: string; note?: string };
	pickupWindowId: string;
	items: { productId: string; quantity: number }[];
};

export class LocalOrderError extends Error {
	constructor(public readonly code: "INVALID_PRODUCT" | "PRODUCT_UNAVAILABLE" | "MAX_QUANTITY_EXCEEDED" | "OUT_OF_STOCK" | "PICKUP_WINDOW_UNAVAILABLE") {
		super(code);
		this.name = "LocalOrderError";
	}
}

export class LocalDemandError extends Error {
	constructor(public readonly code: "PRODUCT_NOT_FOUND" | "PRODUCT_AVAILABLE") {
		super(code);
		this.name = "LocalDemandError";
	}
}

function dataPath(): string {
	return process.env.LOCAL_DATA_FILE || path.join(process.cwd(), ".local", "data.json");
}

let writeQueue: Promise<unknown> = Promise.resolve();

async function readData(): Promise<LocalData> {
	try {
		return JSON.parse(await readFile(dataPath(), "utf8")) as LocalData;
	} catch (error) {
		throw new Error(`Local data is unavailable. Run npm run local:reset. ${error instanceof Error ? error.message : ""}`);
	}
}

async function writeData(data: LocalData): Promise<void> {
	const target = dataPath();
	const temporary = `${target}.tmp`;
	await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
	await rename(temporary, target);
}

function inventoryQuantity(data: LocalData, productId: string): number {
	return data.inventory.find((row) => row.product_id === productId)?.quantity_on_hand ?? 0;
}

export async function getLocalMenu(): Promise<MenuResponse> {
	const data = await readData();
	const categories = data.categories
		.map((category) => ({ id: category.id, name: category.name, sortOrder: category.sort_order }))
		.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
	const items = data.products
		.map((product) => {
			const remaining = inventoryQuantity(data, product.id);
			const available = remaining > 0 && !product.is_archived;
			return {
				id: product.id,
				name: product.name,
				categoryId: product.category_id,
				description: product.description || undefined,
				basePrice: product.price_cents / 100,
				image: product.image ?? undefined,
				maxPerOrder: product.max_per_order,
				isArchived: product.is_archived,
				sortOrder: product.sort_order,
				remaining,
				available,
				availability: { inStock: available },
			};
		})
		.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
	return {
		categories,
		items: items.filter((item) => !item.isArchived),
		archivedItems: items.filter((item) => item.isArchived),
	};
}

export async function getLocalPickupWindows(includeDisabled = false, now = new Date()) {
	const data = await readData();
	return data.pickupWindows
		.filter((window) => includeDisabled || (window.enabled && new Date(window.start_at).getTime() > now.getTime()))
		.sort((a, b) => a.start_at.localeCompare(b.start_at));
}

export async function getLocalOrderByTrackingToken(token: string): Promise<LocalOrderRow | undefined> {
	return (await readData()).orders.find((order) => order.tracking_token === token);
}

export async function listLocalOrders(status?: string): Promise<AdminOrderRecord[]> {
	return (await readData()).orders
		.filter((row) => !status || row.status === status)
		.sort((a, b) => b.created_at.localeCompare(a.created_at))
		.map((row) => ({ ...row.payload, fulfillmentStatus: row.status, trackingToken: row.tracking_token }));
}

export async function listLocalCategories() {
	return (await readData()).categories
		.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
		.map((row) => ({ id: row.id, name: row.name, sortOrder: row.sort_order, createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function listLocalProducts() {
	const data = await readData();
	const soldByProduct = new Map<string, number>();
	for (const order of data.orders.filter((row) => row.status !== "CANCELED")) {
		for (const item of order.payload.items) {
			soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.quantity);
		}
	}
	return data.products
		.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
		.map((row) => ({
			id: row.id,
			categoryId: row.category_id,
			name: row.name,
			description: row.description,
			priceCents: row.price_cents,
			image: row.image,
			maxPerOrder: row.max_per_order,
			isArchived: row.is_archived,
			sortOrder: row.sort_order,
			quantityOnHand: inventoryQuantity(data, row.id),
			soldCount: soldByProduct.get(row.id) ?? 0,
			demandCount: data.demandSignals?.[row.id] ?? 0,
			currentDemandCount: data.demandSignals?.[row.id] ?? 0,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}));
}

export async function getLocalInventory(): Promise<LocalInventoryRow[]> {
	return (await readData()).inventory.sort((a, b) => a.product_id.localeCompare(b.product_id));
}

export function incrementLocalDemand(productId: string): Promise<{ eventType: "sold_out" | "archived"; currentDemandCount: number }> {
	const operation = writeQueue.then(async () => {
		const data = await readData();
		const product = data.products.find((candidate) => candidate.id === productId);
		if (!product) throw new LocalDemandError("PRODUCT_NOT_FOUND");
		if (!product.is_archived && inventoryQuantity(data, productId) > 0) {
			throw new LocalDemandError("PRODUCT_AVAILABLE");
		}
		data.demandSignals ??= {};
		data.demandSignals[productId] = (data.demandSignals[productId] ?? 0) + 1;
		await writeData(data);
		return {
			eventType: product.is_archived ? "archived" as const : "sold_out" as const,
			currentDemandCount: data.demandSignals[productId],
		};
	});
	writeQueue = operation.catch(() => undefined);
	return operation;
}

export function createLocalOrder(
	input: LocalOrderInput,
	options: { id?: string; trackingToken?: string; now?: Date } = {},
): Promise<{ trackingToken: string; order: OrderRecord }> {
	const operation = writeQueue.then(async () => {
		const data = await readData();
		const now = options.now ?? new Date();
		const pickupWindow = data.pickupWindows.find((window) => window.id === input.pickupWindowId);
		if (!pickupWindow || !pickupWindow.enabled || new Date(pickupWindow.start_at).getTime() <= now.getTime()) {
			throw new LocalOrderError("PICKUP_WINDOW_UNAVAILABLE");
		}

		const orderItems = input.items.map(({ productId, quantity }) => {
			const product = data.products.find((candidate) => candidate.id === productId);
			if (!product) throw new LocalOrderError("INVALID_PRODUCT");
			if (product.is_archived) throw new LocalOrderError("PRODUCT_UNAVAILABLE");
			if (quantity > product.max_per_order) throw new LocalOrderError("MAX_QUANTITY_EXCEEDED");
			if (inventoryQuantity(data, productId) < quantity) throw new LocalOrderError("OUT_OF_STOCK");
			return {
				productId,
				name: product.name,
				unitPriceCents: product.price_cents,
				quantity,
				lineTotalCents: product.price_cents * quantity,
			};
		});

		for (const item of orderItems) {
			const inventory = data.inventory.find((row) => row.product_id === item.productId);
			if (inventory) inventory.quantity_on_hand -= item.quantity;
		}
		const subtotalCents = orderItems.reduce((total, item) => total + item.lineTotalCents, 0);
		const id = options.id ?? `ord_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
		const trackingToken = options.trackingToken ?? crypto.randomUUID();
		const order: OrderRecord = {
			id,
			createdAt: now.toISOString(),
			fulfillmentStatus: "RECEIVED",
			payment: { ...input.payment, status: "PENDING" },
			customer: input.customer,
			pickup: { windowId: pickupWindow.id, startAt: pickupWindow.start_at, endAt: pickupWindow.end_at },
			items: orderItems,
			totals: { subtotalCents, totalCents: subtotalCents },
		};
		data.orders.push({ id, tracking_token: trackingToken, created_at: order.createdAt, status: "RECEIVED", payload: order });
		await writeData(data);
		return { trackingToken, order };
	});
	writeQueue = operation.catch(() => undefined);
	return operation;
}
