"use client";

import { useEffect, useState } from "react";
import type { AdminMenuCategory, AdminMenuProduct } from "@/lib/adminMenu";
import { uploadProductImage, validateSelectedProductImage } from "@/lib/productImageClient";
import { saveProductWithOptionalImage } from "@/lib/productImageWorkflow";

type ProductValues = {
	name: string;
	description: string;
	priceCents: number;
	categoryId: string;
	maxPerOrder: number;
};

type ProductFormProps = {
	product: AdminMenuProduct | null;
	categories: AdminMenuCategory[];
	onCancel: () => void;
	onSave: (values: ProductValues, product: AdminMenuProduct | null) => Promise<AdminMenuProduct>;
	onProductSaved: (product: AdminMenuProduct) => void;
	onComplete: () => void;
};

type PhotoStage = "idle" | "preparing" | "uploading" | "finalizing" | "failed";

export function ProductForm({ product, categories, onCancel, onSave, onProductSaved, onComplete }: ProductFormProps) {
	const [name, setName] = useState(product?.name ?? "");
	const [description, setDescription] = useState(product?.description ?? "");
	const [price, setPrice] = useState(product ? (product.priceCents / 100).toFixed(2) : "");
	const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
	const [maxPerOrder, setMaxPerOrder] = useState(String(product?.maxPerOrder ?? 12));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [savedProduct, setSavedProduct] = useState(product);
	const [photoStage, setPhotoStage] = useState<PhotoStage>("idle");

	useEffect(() => () => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	}, [previewUrl]);

	function productValues(): ProductValues | null {
		const parsedPrice = /^\d+(\.\d{1,2})?$/.test(price) ? Math.round(Number(price) * 100) : -1;
		const parsedMaximum = /^\d+$/.test(maxPerOrder) ? Number(maxPerOrder) : 0;
		if (!name.trim() || parsedPrice < 0 || !Number.isSafeInteger(parsedMaximum) || parsedMaximum < 1 || !categoryId) {
			setError("Please enter a name, price, category, and whole-number order limit.");
			return null;
		}
		return { name: name.trim(), description: description.trim(), priceCents: parsedPrice, categoryId, maxPerOrder: parsedMaximum };
	}

	function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0] ?? null;
		if (!file) return;
		try {
			validateSelectedProductImage(file);
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			setSelectedFile(file);
			setPreviewUrl(URL.createObjectURL(file));
			setPhotoStage("idle");
			setError(null);
		} catch (selectionError) {
			event.target.value = "";
			setError(selectionError instanceof Error ? selectionError.message : "Choose a valid product photo.");
		}
	}

	async function saveAndUpload(values: ProductValues, retryOnly = false) {
		const result = await saveProductWithOptionalImage({
			existingProduct: savedProduct,
			selectedFile,
			skipProductSave: retryOnly,
			saveProduct: (existing) => onSave(values, existing),
			uploadImage: (saved, file) => uploadProductImage(saved, file, setPhotoStage),
		});
		setSavedProduct(result.product);
		onProductSaved(result.product);
		if (result.imageError) {
			setPhotoStage("failed");
			setError(result.productWasCreated
				? `Product created, but its photo failed to upload. ${result.imageError}`
				: `Product saved, but its photo failed to upload. The previous photo is unchanged. ${result.imageError}`);
			return false;
		}
		return true;
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		const values = productValues();
		if (!values) return;
		setSaving(true);
		setError(null);
		try {
			if (await saveAndUpload(values)) onComplete();
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : "Product could not be saved.");
		} finally {
			setSaving(false);
		}
	}

	async function retryPhoto() {
		const values = productValues();
		if (!savedProduct || !selectedFile || !values) return;
		setSaving(true);
		setError(null);
		try {
			if (await saveAndUpload(values, true)) onComplete();
		} finally {
			setSaving(false);
		}
	}

	const displayedImage = previewUrl ?? savedProduct?.image ?? "/img/placeholder.svg";
	const hasPhoto = Boolean(previewUrl ?? savedProduct?.image);
	const photoStatus = photoStage === "preparing" ? "Preparing image…"
		: photoStage === "uploading" ? "Uploading photo…"
			: photoStage === "finalizing" ? "Saving photo…"
				: photoStage === "failed" ? "Photo upload failed. You can retry without recreating the product."
					: selectedFile ? `${selectedFile.name} selected` : "JPEG, PNG, WebP, or GIF · maximum 15 MB";

	return (
		<div className="fixed inset-0 z-40 flex items-end bg-cocoa/40 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
			<section className="max-h-[92vh] w-full overflow-y-auto rounded-t-card border border-crust bg-cream p-5 shadow-card sm:max-w-lg sm:rounded-card sm:p-6">
				<h2 id="product-form-title" className="font-display text-xl font-semibold text-cocoa">{savedProduct ? `Edit ${savedProduct.name}` : "Add Product"}</h2>
				{error && <p className="mt-3 rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry" role="alert">{error}</p>}
				<form onSubmit={submit} className="mt-4 grid gap-4">
					<div className="grid grid-cols-[96px_1fr] items-center gap-4 sm:grid-cols-[120px_1fr]">
						<div className="aspect-square overflow-hidden rounded-lg border border-crust bg-wheat">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={displayedImage} alt="Product photo preview" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.src = "/img/placeholder.svg"; }} />
						</div>
						<div className="min-w-0">
							<label className="btn-secondary inline-flex min-h-11 cursor-pointer items-center justify-center text-center">
								{hasPhoto ? "Replace Photo" : "Choose Photo"}
								<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" onChange={choosePhoto} disabled={saving} />
							</label>
							<p className="mt-2 break-words text-xs text-sage" role="status">{photoStatus}</p>
							{photoStage === "failed" && savedProduct && selectedFile && <button type="button" className="mt-2 min-h-11 font-semibold text-caramel underline underline-offset-4" onClick={() => void retryPhoto()} disabled={saving}>Retry Photo</button>}
						</div>
					</div>
					<label><span className="mb-1 block text-sm font-medium">Name</span><input className="input-base" value={name} onChange={(event) => setName(event.target.value)} required disabled={saving} /></label>
					<label><span className="mb-1 block text-sm font-medium">Description</span><textarea className="input-base min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} /></label>
					<div className="grid grid-cols-2 gap-3">
						<label><span className="mb-1 block text-sm font-medium">Price</span><input className="input-base" inputMode="decimal" placeholder="3.50" value={price} onChange={(event) => setPrice(event.target.value)} required disabled={saving} /></label>
						<label><span className="mb-1 block text-sm font-medium">Max per order</span><input className="input-base" inputMode="numeric" value={maxPerOrder} onChange={(event) => setMaxPerOrder(event.target.value)} required disabled={saving} /></label>
					</div>
					<label><span className="mb-1 block text-sm font-medium">Category</span><select className="input-base" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required disabled={saving}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
					<div className="mt-2 grid grid-cols-2 gap-3">
						<button type="button" className="btn-secondary min-h-11" onClick={onCancel} disabled={saving}>Cancel</button>
						<button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Product"}</button>
					</div>
				</form>
			</section>
		</div>
	);
}
