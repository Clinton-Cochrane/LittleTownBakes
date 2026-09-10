"use client";

import { useState } from "react";
import type { AdminMenuCategory, AdminMenuProduct } from "@/lib/adminMenu";

type ProductFormProps = {
	product: AdminMenuProduct | null;
	categories: AdminMenuCategory[];
	onCancel: () => void;
	onSave: (values: {
		name: string;
		description: string;
		priceCents: number;
		categoryId: string;
		maxPerOrder: number;
	}) => Promise<void>;
};

export function ProductForm({ product, categories, onCancel, onSave }: ProductFormProps) {
	const [name, setName] = useState(product?.name ?? "");
	const [description, setDescription] = useState(product?.description ?? "");
	const [price, setPrice] = useState(product ? (product.priceCents / 100).toFixed(2) : "");
	const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
	const [maxPerOrder, setMaxPerOrder] = useState(String(product?.maxPerOrder ?? 12));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		const parsedPrice = /^\d+(\.\d{1,2})?$/.test(price) ? Math.round(Number(price) * 100) : -1;
		const parsedMaximum = /^\d+$/.test(maxPerOrder) ? Number(maxPerOrder) : 0;
		if (!name.trim() || parsedPrice < 0 || !Number.isSafeInteger(parsedMaximum) || parsedMaximum < 1 || !categoryId) {
			setError("Please enter a name, price, category, and whole-number order limit.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await onSave({
				name: name.trim(),
				description: description.trim(),
				priceCents: parsedPrice,
				categoryId,
				maxPerOrder: parsedMaximum,
			});
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : "Product could not be saved.");
			setSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-40 flex items-end bg-cocoa/40 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
			<section className="max-h-[92vh] w-full overflow-y-auto rounded-t-card border border-crust bg-cream p-5 shadow-card sm:max-w-lg sm:rounded-card sm:p-6">
				<h2 id="product-form-title" className="font-display text-xl font-semibold text-cocoa">
					{product ? `Edit ${product.name}` : "Add Product"}
				</h2>
				{error && <p className="mt-3 rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry" role="alert">{error}</p>}
				<form onSubmit={submit} className="mt-4 grid gap-4">
					<label><span className="mb-1 block text-sm font-medium">Name</span><input className="input-base" value={name} onChange={(event) => setName(event.target.value)} required /></label>
					<label><span className="mb-1 block text-sm font-medium">Description</span><textarea className="input-base min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
					<div className="grid grid-cols-2 gap-3">
						<label><span className="mb-1 block text-sm font-medium">Price</span><input className="input-base" inputMode="decimal" placeholder="3.50" value={price} onChange={(event) => setPrice(event.target.value)} required /></label>
						<label><span className="mb-1 block text-sm font-medium">Max per order</span><input className="input-base" inputMode="numeric" value={maxPerOrder} onChange={(event) => setMaxPerOrder(event.target.value)} required /></label>
					</div>
					<label><span className="mb-1 block text-sm font-medium">Category</span><select className="input-base" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
					<div className="mt-2 grid grid-cols-2 gap-3">
						<button type="button" className="btn-secondary min-h-11" onClick={onCancel} disabled={saving}>Cancel</button>
						<button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Product"}</button>
					</div>
				</form>
			</section>
		</div>
	);
}
