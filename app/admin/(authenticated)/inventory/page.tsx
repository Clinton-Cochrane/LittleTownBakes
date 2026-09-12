"use client";

import { useEffect, useRef, useState } from "react";
import { handleAdminAuthFailure } from "@/lib/adminResponse";
import { ProductActionQueue } from "@/lib/adminMenu";
import type { ProductInventory } from "@/lib/inventory";
import { stringifyInventoryTemplateCsv } from "@/lib/inventoryBulk";
import { AddProductAction } from "@/components/admin/menu/AddProductAction";
import type { AdminMenuCategory, AdminMenuProduct } from "@/lib/adminMenu";

type MenuItem = { id: string; name: string };
type InventoryMutation = { product_id: string; quantity_on_hand: number };

const MAX_QUANTITY = 2_147_483_647;

function parseQuantity(value: string): number | null {
	if (!/^\d+$/.test(value)) return null;
	const quantity = Number(value);
	return Number.isSafeInteger(quantity) && quantity <= MAX_QUANTITY ? quantity : null;
}

function StockRow({
	product,
	quantity,
	pending,
	error,
	onSet,
	onAdjust,
	onInvalid,
	onClearError,
}: {
	product: MenuItem;
	quantity: number;
	pending: number;
	error?: string;
	onSet: (quantity: number) => Promise<number>;
	onAdjust: (delta: -1 | 1) => Promise<number>;
	onInvalid: (message: string) => void;
	onClearError: () => void;
}) {
	const [draft, setDraft] = useState(String(quantity));

	useEffect(() => setDraft(String(quantity)), [quantity]);

	async function saveDraft() {
		const parsed = parseQuantity(draft);
		if (parsed === null) {
			setDraft(String(quantity));
			onInvalid("Enter a whole number from 0 to 2147483647. The change was not saved.");
			return;
		}
		if (parsed === quantity) {
			setDraft(String(quantity));
			return;
		}
		setDraft(String(await onSet(parsed)));
	}

	return (
		<article className="rounded-card border border-crust bg-wheat/50 p-4" aria-busy={pending > 0}>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<h3 className="break-words font-semibold text-cocoa">{product.name}</h3>
					{pending > 0 && <p className="mt-1 text-xs text-muted" role="status">Saving…</p>}
				</div>
				<div className="flex items-center gap-2" aria-label={`Change stock for ${product.name}`}>
					<button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-button border border-caramel bg-cream text-2xl font-semibold text-caramel disabled:opacity-40" aria-label={`Remove one ${product.name}`} disabled={quantity === 0} onClick={() => void onAdjust(-1)}>−</button>
					<input
						type="text"
						inputMode="numeric"
						className="input-base h-12 w-24 text-center text-lg font-semibold tabular-nums"
						aria-label={`${product.name} quantity`}
						value={draft}
						disabled={pending > 0}
						onChange={(event) => { setDraft(event.target.value); onClearError(); }}
						onBlur={() => void saveDraft()}
					/>
					<button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-button border border-caramel bg-honey text-2xl font-semibold text-white" aria-label={`Add one ${product.name}`} onClick={() => void onAdjust(1)}>+</button>
				</div>
			</div>
			{error && <p className="mt-3 rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry" role="alert">{error}</p>}
		</article>
	);
}

export default function AdminInventoryPage() {
	const [inventory, setInventory] = useState<ProductInventory[]>([]);
	const inventoryRef = useRef<ProductInventory[]>([]);
	const [currentProducts, setCurrentProducts] = useState<MenuItem[]>([]);
	const [templateProducts, setTemplateProducts] = useState<MenuItem[]>([]);
	const [categories, setCategories] = useState<AdminMenuCategory[]>([]);
	const [loading, setLoading] = useState(true);
	const [pending, setPending] = useState<Record<string, number>>({});
	const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const queue = useRef(new ProductActionQueue());

	function replaceInventory(next: ProductInventory[]) {
		inventoryRef.current = next;
		setInventory(next);
	}

	function updateInventory(saved: InventoryMutation) {
		const next = inventoryRef.current.some((row) => row.product_id === saved.product_id)
			? inventoryRef.current.map((row) => row.product_id === saved.product_id ? { ...row, ...saved } : row)
			: [...inventoryRef.current, saved];
		replaceInventory(next);
	}

	function currentQuantity(productId: string) {
		return inventoryRef.current.find((row) => row.product_id === productId)?.quantity_on_hand ?? 0;
	}

	async function loadInventory() {
		const response = await fetch("/api/admin/inventory");
		if (!response.ok) {
			setError(handleAdminAuthFailure(response) ?? `Failed to load inventory (${response.status}).`);
			return;
		}
		replaceInventory(await response.json());
	}

	async function refreshProduct(productId: string) {
		const response = await fetch("/api/admin/inventory");
		if (!response.ok) return currentQuantity(productId);
		const fresh = await response.json() as ProductInventory[];
		replaceInventory(fresh);
		return fresh.find((row) => row.product_id === productId)?.quantity_on_hand ?? 0;
	}

	useEffect(() => {
		Promise.all([fetch("/api/admin/inventory"), fetch("/api/menu"), fetch("/api/admin/categories")])
			.then(async ([inventoryResponse, menuResponse, categoriesResponse]) => {
				if (!inventoryResponse.ok) {
					setError(handleAdminAuthFailure(inventoryResponse) ?? `Failed to load inventory (${inventoryResponse.status}).`);
					return;
				}
				if (!menuResponse.ok) {
					setError(`Failed to load current products (${menuResponse.status}).`);
					return;
				}
				if (!categoriesResponse.ok) {
					setError(handleAdminAuthFailure(categoriesResponse) ?? `Failed to load product categories (${categoriesResponse.status}).`);
					return;
				}
				replaceInventory(await inventoryResponse.json());
				const menu = await menuResponse.json();
				const active = (menu.items ?? []) as MenuItem[];
				const archived = (menu.archivedItems ?? []) as MenuItem[];
				setCurrentProducts(active);
				setTemplateProducts([...active, ...archived]);
				setCategories(await categoriesResponse.json());
			})
			.catch(() => setError("Inventory could not be loaded. Please try again."))
			.finally(() => setLoading(false));
	}, []);

	function triggerDownload(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = filename;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function downloadExport(format: "csv" | "json") {
		const response = await fetch(`/api/admin/inventory/export?format=${format}`);
		if (!response.ok) {
			setError(handleAdminAuthFailure(response) ?? `Download failed (${response.status}).`);
			return;
		}
		triggerDownload(await response.blob(), `inventory.${format}`);
	}

	function downloadTemplate() {
		const csv = stringifyInventoryTemplateCsv(templateProducts.map((item) => ({ product_id: item.id, product_name: item.name })));
		triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "inventory-template.csv");
	}

	async function uploadBulkFile(file: File) {
		setError(null);
		const isJson = file.name.toLowerCase().endsWith(".json");
		const response = await fetch("/api/admin/inventory/bulk", {
			method: "POST",
			headers: { "Content-Type": isJson ? "application/json" : "text/csv" },
			body: await file.text(),
		});
		const result = await response.json().catch(() => ({}));
		if (!response.ok) {
			setError(handleAdminAuthFailure(response) ?? result.error ?? `Upload failed (${response.status}).`);
			return;
		}
		setMessage(`${result.updated ?? 0} updated${result.errors?.length ? `; ${result.errors.length} failed` : ""}.`);
		await loadInventory();
	}

	function mutateProduct(productId: string, path: string, body: object, fallback: string): Promise<number> {
		setRowErrors((current) => ({ ...current, [productId]: "" }));
		setPending((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
		let authoritative = currentQuantity(productId);
		return queue.current.enqueue(productId, async () => {
			try {
				const response = await fetch(path, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				if (!response.ok) {
					const result = await response.json().catch(() => ({}));
					authoritative = await refreshProduct(productId);
					const detail = handleAdminAuthFailure(response) ?? result.error;
					setRowErrors((current) => ({ ...current, [productId]: detail ? `${detail} The change was not saved; the saved quantity has been restored.` : fallback }));
					return;
				}
				const saved = await response.json() as InventoryMutation;
				authoritative = saved.quantity_on_hand;
				updateInventory(saved);
				setRowErrors((current) => ({ ...current, [productId]: "" }));
			} catch {
				authoritative = await refreshProduct(productId);
				setRowErrors((current) => ({ ...current, [productId]: fallback }));
			} finally {
				setPending((current) => ({ ...current, [productId]: Math.max(0, (current[productId] ?? 1) - 1) }));
			}
		}).then(() => authoritative);
	}

	function setQuantity(productId: string, quantity: number) {
		return mutateProduct(productId, "/api/admin/inventory", { product_id: productId, quantity_on_hand: quantity }, "This quantity was not saved. The saved quantity has been restored.");
	}

	function adjustQuantity(productId: string, delta: -1 | 1) {
		if (delta === -1 && currentQuantity(productId) === 0) return Promise.resolve(0);
		return mutateProduct(productId, "/api/admin/inventory/adjust", { product_id: productId, delta }, "This stock change was not saved. The saved quantity has been restored.");
	}

	function addCreatedProduct(product: AdminMenuProduct) {
		const item = { id: product.id, name: product.name };
		setCurrentProducts((current) => current.some((candidate) => candidate.id === product.id)
			? current.map((candidate) => candidate.id === product.id ? item : candidate)
			: [...current, item]);
		setTemplateProducts((current) => current.some((candidate) => candidate.id === product.id)
			? current.map((candidate) => candidate.id === product.id ? item : candidate)
			: [...current, item]);
	}

	if (loading) return <main className="mx-auto max-w-5xl px-4 py-6"><p className="text-muted">Loading...</p></main>;

	return (
		<main className="mx-auto max-w-5xl px-4 py-6">
			<div className="flex items-start justify-between gap-3">
				<div><h1 className="font-display text-2xl font-semibold text-cocoa">Inventory</h1><p className="mt-1 text-sm text-muted">Adjust current stock quickly or type an exact quantity.</p></div>
				<AddProductAction categories={categories} onCreated={addCreatedProduct} />
			</div>
			{error && <p className="mb-4 mt-4 rounded-lg bg-berry/10 px-4 py-2 text-berry" role="alert">{error}</p>}
			{message && <p className="mb-4 mt-4 text-sm text-success" role="status">{message}</p>}

			<section className="mb-8 mt-6" aria-labelledby="current-stock-heading">
				<h2 id="current-stock-heading" className="mb-3 font-display text-lg font-semibold text-cocoa">Current stock</h2>
				<div className="grid gap-3">
					{currentProducts.map((product) => <StockRow key={product.id} product={product} quantity={inventory.find((row) => row.product_id === product.id)?.quantity_on_hand ?? 0} pending={pending[product.id] ?? 0} error={rowErrors[product.id]} onSet={(quantity) => setQuantity(product.id, quantity)} onAdjust={(delta) => adjustQuantity(product.id, delta)} onInvalid={(message) => setRowErrors((current) => ({ ...current, [product.id]: message }))} onClearError={() => setRowErrors((current) => ({ ...current, [product.id]: "" }))} />)}
					{currentProducts.length === 0 && <p className="card-warm p-5 text-muted">No products are on the current menu.</p>}
				</div>
			</section>

			<section className="card-warm p-6 sm:p-8" aria-labelledby="bulk-edit-heading">
				<h2 id="bulk-edit-heading" className="mb-3 font-display text-lg font-semibold text-cocoa">Bulk edit</h2>
				<div className="mb-4 flex flex-wrap gap-2">
					<button type="button" onClick={() => void downloadExport("csv")} className="btn-secondary">Download CSV</button>
					<button type="button" onClick={() => void downloadExport("json")} className="btn-secondary">Download JSON</button>
					<button type="button" onClick={downloadTemplate} className="btn-secondary">Product template</button>
				</div>
				<input type="file" aria-label="Upload inventory file" accept=".csv,.json,text/csv,application/json" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadBulkFile(file); }} className="input-base max-w-md" />
			</section>
		</main>
	);
}
