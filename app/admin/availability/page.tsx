"use client";

import { useEffect, useState } from "react";
import type { ProductInventory } from "@/lib/inventory";
import { stringifyInventoryTemplateCsv } from "@/lib/inventoryBulk";
import { handleAdminAuthFailure } from "@/lib/adminResponse";

type MenuItem = { id: string; name: string };

export default function AdminAvailabilityPage() {
	const [inventory, setInventory] = useState<ProductInventory[]>([]);
	const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState({ product_id: "", quantity_on_hand: 0 });
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function loadInventory() {
		const response = await fetch("/api/admin/inventory");
		if (!response.ok) {
			setError(handleAdminAuthFailure(response) ?? `Failed to load inventory (${response.status}).`);
			return;
		}
		setInventory(await response.json());
	}

	useEffect(() => {
		Promise.all([fetch("/api/admin/inventory"), fetch("/api/menu")])
			.then(async ([inventoryResponse, menuResponse]) => {
				if (!inventoryResponse.ok) {
					setError(handleAdminAuthFailure(inventoryResponse) ?? `Failed to load inventory (${inventoryResponse.status}).`);
					return;
				}
				setInventory(await inventoryResponse.json());
				const menu = await menuResponse.json();
				setMenuItems([...(menu.items ?? []), ...(menu.archivedItems ?? [])]);
			})
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
		const csv = stringifyInventoryTemplateCsv(
			menuItems.map((item) => ({ product_id: item.id, product_name: item.name }))
		);
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

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		const response = await fetch("/api/admin/inventory", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form),
		});
		setSaving(false);
		if (!response.ok) {
			const result = await response.json().catch(() => ({}));
			setError(handleAdminAuthFailure(response) ?? result.error ?? `Could not save inventory (${response.status}).`);
			return;
		}
		const saved = await response.json();
		setInventory((current) => current.map((row) => row.product_id === saved.product_id ? saved : row));
		setMessage("Inventory saved.");
	}

	if (loading) return <main className="mx-auto max-w-5xl px-4 py-6"><p className="text-sage">Loading...</p></main>;

	return (
		<main className="mx-auto max-w-5xl px-4 py-6">
			<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Inventory</h1>
			<p className="mb-6 text-sm text-sage">Set the exact quantity currently on hand for each product.</p>
			{error && <p className="mb-4 rounded-lg bg-berry/10 px-4 py-2 text-berry" role="alert">{error}</p>}
			{message && <p className="mb-4 text-sm text-success" role="status">{message}</p>}

			<section className="card-warm mb-8 p-6 sm:p-8">
				<h2 className="mb-4 font-display text-lg font-semibold text-cocoa">Update on-hand stock</h2>
				<form onSubmit={handleSubmit} className="grid max-w-md gap-4">
					<label><span className="mb-1.5 block text-sm font-medium text-cocoa">Product</span>
						<select value={form.product_id} onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))} required className="input-base">
							<option value="">Select product</option>
							{menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
						</select>
					</label>
					<label><span className="mb-1.5 block text-sm font-medium text-cocoa">On hand</span>
						<input type="number" min={0} step={1} value={form.quantity_on_hand} onChange={(event) => setForm((current) => ({ ...current, quantity_on_hand: Number(event.target.value) }))} required className="input-base" />
					</label>
					<button type="submit" disabled={saving || !form.product_id} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
				</form>
			</section>

			<section className="card-warm mb-8 p-6 sm:p-8">
				<h2 className="mb-3 font-display text-lg font-semibold text-cocoa">Bulk edit</h2>
				<div className="mb-4 flex flex-wrap gap-2">
					<button type="button" onClick={() => void downloadExport("csv")} className="btn-secondary">Download CSV</button>
					<button type="button" onClick={() => void downloadExport("json")} className="btn-secondary">Download JSON</button>
					<button type="button" onClick={downloadTemplate} className="btn-secondary">Product template</button>
				</div>
				<input type="file" accept=".csv,.json,text/csv,application/json" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadBulkFile(file); }} className="input-base max-w-md" />
			</section>

			<section>
				<h2 className="mb-3 font-display text-lg font-semibold text-cocoa">Current stock</h2>
				<div className="overflow-x-auto rounded-card border border-crust bg-wheat/50 shadow-soft">
					<table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-crust bg-cream/90"><th className="px-4 py-3">Product</th><th className="px-4 py-3">On hand</th></tr></thead>
						<tbody>{inventory.map((row) => <tr key={row.product_id} className="border-b border-crust/80 last:border-0"><td className="px-4 py-3">{menuItems.find((item) => item.id === row.product_id)?.name ?? row.product_id}</td><td className="px-4 py-3 tabular-nums">{row.quantity_on_hand}</td></tr>)}</tbody>
					</table>
				</div>
			</section>
		</main>
	);
}
