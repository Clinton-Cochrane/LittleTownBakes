"use client";

import { useEffect, useRef, useState } from "react";
import { handleAdminAuthFailure } from "@/lib/adminResponse";
import {
	ProductActionQueue,
	splitMenuProducts,
	type AdminMenuCategory,
	type AdminMenuProduct,
} from "@/lib/adminMenu";
import { MenuProductCard, PastFlavorCard } from "./MenuProductCard";
import { ProductForm } from "./ProductForm";

type View = "current" | "past";

async function responseError(response: Response, fallback: string) {
	const authError = handleAdminAuthFailure(response);
	if (authError) return authError;
	const body = await response.json().catch(() => ({}));
	return (body as { error?: string }).error ?? fallback;
}

export function AdminMenu() {
	const [products, setProducts] = useState<AdminMenuProduct[]>([]);
	const [categories, setCategories] = useState<AdminMenuCategory[]>([]);
	const [view, setView] = useState<View>("current");
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [productErrors, setProductErrors] = useState<Record<string, string>>({});
	const [pending, setPending] = useState<Record<string, number>>({});
	const [editing, setEditing] = useState<AdminMenuProduct | null | undefined>(undefined);
	const queue = useRef(new ProductActionQueue());

	async function loadMenu() {
		setLoading(true);
		setLoadError(null);
		try {
			const [productsResponse, categoriesResponse] = await Promise.all([
				fetch("/api/admin/products"),
				fetch("/api/admin/categories"),
			]);
			if (!productsResponse.ok) throw new Error(await responseError(productsResponse, "Menu could not be loaded."));
			if (!categoriesResponse.ok) throw new Error(await responseError(categoriesResponse, "Categories could not be loaded."));
			const [productData, categoryData] = await Promise.all([productsResponse.json(), categoriesResponse.json()]);
			setProducts(Array.isArray(productData) ? productData : []);
			setCategories(Array.isArray(categoryData) ? categoryData : []);
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : "Menu could not be loaded. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (new URLSearchParams(window.location.search).get("view") === "past") setView("past");
		void loadMenu();
	}, []);

	function chooseView(nextView: View) {
		setView(nextView);
		window.history.replaceState(null, "", nextView === "past" ? "/admin/menu?view=past" : "/admin/menu");
	}

	function updateProduct(saved: AdminMenuProduct) {
		setProducts((current) => current.map((product) => product.id === saved.id ? saved : product));
	}

	async function refreshProduct(productId: string) {
		const response = await fetch("/api/admin/products");
		if (!response.ok) return;
		const fresh = (await response.json()) as AdminMenuProduct[];
		const product = fresh.find((candidate) => candidate.id === productId);
		if (product) updateProduct(product);
	}

	function adjust(productId: string, delta: number) {
		setProductErrors((current) => ({ ...current, [productId]: "" }));
		setPending((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
		void queue.current.enqueue(productId, async () => {
			try {
				const response = await fetch("/api/admin/inventory/adjust", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ product_id: productId, delta }),
				});
				if (!response.ok) {
					const message = await responseError(response, "Quantity could not be updated. Please try again.");
					await refreshProduct(productId);
					setProductErrors((current) => ({ ...current, [productId]: message }));
					return;
				}
				const inventory = await response.json() as { quantity_on_hand: number };
				setProducts((current) => current.map((product) => product.id === productId
					? { ...product, quantityOnHand: inventory.quantity_on_hand }
					: product));
				setProductErrors((current) => ({ ...current, [productId]: "" }));
			} catch {
				await refreshProduct(productId);
				setProductErrors((current) => ({ ...current, [productId]: "Quantity could not be updated. Check your connection and try again." }));
			} finally {
				setPending((current) => ({ ...current, [productId]: Math.max(0, (current[productId] ?? 1) - 1) }));
			}
		});
	}

	async function saveProduct(values: { name: string; description: string; priceCents: number; categoryId: string; maxPerOrder: number }) {
		const product = editing ?? null;
		const response = await fetch(product ? `/api/admin/products/${encodeURIComponent(product.id)}` : "/api/admin/products", {
			method: product ? "PATCH" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(product ? values : { ...values, image: null }),
		});
		if (!response.ok) throw new Error(await responseError(response, "Product could not be saved."));
		const saved = await response.json() as AdminMenuProduct;
		setProducts((current) => product
			? current.map((candidate) => candidate.id === saved.id ? saved : candidate)
			: [...current, saved]);
		setEditing(undefined);
		if (!product) chooseView("current");
	}

	async function archive(product: AdminMenuProduct) {
		if (!window.confirm(`Archive ${product.name}?\n\nIt will leave the current menu but remain in Past Flavors.`)) return;
		setProductErrors((current) => ({ ...current, [product.id]: "" }));
		try {
			const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/archive`, { method: "POST" });
			if (!response.ok) {
				const message = await responseError(response, "This product could not be archived. Please try again.");
				setProductErrors((current) => ({ ...current, [product.id]: message }));
				return;
			}
			updateProduct(await response.json());
		} catch {
			setProductErrors((current) => ({ ...current, [product.id]: "This product could not be archived. Check your connection and try again." }));
		}
	}

	async function restore(product: AdminMenuProduct) {
		setProductErrors((current) => ({ ...current, [product.id]: "" }));
		const productPath = `/api/admin/products/${encodeURIComponent(product.id)}`;
		try {
			const unarchiveResponse = await fetch(`${productPath}/unarchive`, { method: "POST" });
			if (!unarchiveResponse.ok) {
				const message = await responseError(unarchiveResponse, "This flavor could not be restored. Please try again.");
				setProductErrors((current) => ({ ...current, [product.id]: message }));
				return;
			}
			const restored = await unarchiveResponse.json() as AdminMenuProduct;
			const resetResponse = await fetch("/api/admin/inventory", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ product_id: product.id, quantity_on_hand: 0 }),
			});
			if (!resetResponse.ok) {
				await fetch(`${productPath}/archive`, { method: "POST" }).catch(() => undefined);
				await refreshProduct(product.id);
				const message = await responseError(resetResponse, "This flavor could not be restored safely. Please try again.");
				setProductErrors((current) => ({ ...current, [product.id]: message }));
				return;
			}
			updateProduct({ ...restored, quantityOnHand: 0 });
			chooseView("current");
		} catch {
			await refreshProduct(product.id);
			setProductErrors((current) => ({ ...current, [product.id]: "This flavor could not be restored. Check your connection and try again." }));
		}
	}

	const views = splitMenuProducts(products);
	if (loading) return <p className="py-10 text-center text-sage" role="status">Loading menu…</p>;
	if (loadError) return <div className="py-8"><p className="rounded-lg bg-berry/10 px-4 py-3 text-berry" role="alert">{loadError}</p><button className="btn-primary mt-4" onClick={() => void loadMenu()}>Try Again</button></div>;

	return (
		<>
			<div className="flex items-start justify-between gap-3">
				<div><h1 className="font-display text-2xl font-semibold text-cocoa">Menu</h1><p className="mt-1 text-sm text-sage">Manage what is available today.</p></div>
				<button type="button" className="btn-primary shrink-0" onClick={() => setEditing(null)} disabled={categories.length === 0}>Add Product</button>
			</div>
			<div className="mt-6 grid grid-cols-2 rounded-button border border-crust bg-wheat p-1" role="tablist" aria-label="Menu views">
				<button type="button" role="tab" aria-selected={view === "current"} className={`min-h-11 rounded-lg px-3 font-semibold ${view === "current" ? "bg-cream text-cocoa shadow-soft" : "text-sage"}`} onClick={() => chooseView("current")}>Current Menu ({views.active.length})</button>
				<button type="button" role="tab" aria-selected={view === "past"} className={`min-h-11 rounded-lg px-3 font-semibold ${view === "past" ? "bg-cream text-cocoa shadow-soft" : "text-sage"}`} onClick={() => chooseView("past")}>Past Flavors ({views.archived.length})</button>
			</div>
			<section className="mt-5 grid gap-4" aria-label={view === "current" ? "Current menu" : "Past Flavors"}>
				{view === "current" ? views.active.map((product) => <MenuProductCard key={product.id} product={product} pending={pending[product.id]} error={productErrors[product.id]} onAdjust={(delta) => adjust(product.id, delta)} onEdit={() => setEditing(product)} onArchive={() => void archive(product)} />) : views.archived.map((product) => <PastFlavorCard key={product.id} product={product} error={productErrors[product.id]} onEdit={() => setEditing(product)} onRestore={() => void restore(product)} />)}
				{(view === "current" ? views.active : views.archived).length === 0 && <p className="card-warm p-5 text-sage">{view === "current" ? "No products are on the current menu yet." : "No Past Flavors yet."}</p>}
			</section>
			{editing !== undefined && <ProductForm key={editing?.id ?? "new"} product={editing} categories={categories} onCancel={() => setEditing(undefined)} onSave={saveProduct} />}
		</>
	);
}
