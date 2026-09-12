"use client";

import { useState } from "react";
import { handleAdminAuthFailure } from "@/lib/adminResponse";
import type { AdminMenuCategory, AdminMenuProduct } from "@/lib/adminMenu";
import { ProductForm, type ProductValues } from "./ProductForm";

type AddProductActionProps = {
	categories: AdminMenuCategory[];
	onCreated: (product: AdminMenuProduct) => void;
};

async function createProduct(values: ProductValues) {
	const response = await fetch("/api/admin/products", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ...values, image: null }),
	});
	if (!response.ok) {
		const authError = handleAdminAuthFailure(response);
		const body = authError ? null : await response.json().catch(() => ({}));
		throw new Error(authError ?? (body as { error?: string } | null)?.error ?? "Product could not be saved.");
	}
	return response.json() as Promise<AdminMenuProduct>;
}

export function AddProductAction({ categories, onCreated }: AddProductActionProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button type="button" className="btn-primary shrink-0" onClick={() => setOpen(true)} disabled={categories.length === 0}>Add Product</button>
			{open && (
				<ProductForm
					product={null}
					categories={categories}
					onCancel={() => setOpen(false)}
					onSave={(values) => createProduct(values)}
					onProductSaved={onCreated}
					onComplete={() => setOpen(false)}
				/>
			)}
		</>
	);
}
