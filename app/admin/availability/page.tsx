"use client";

import { useEffect, useState } from "react";
import type { InventorySlot } from "@/lib/inventory";
import { getWeekStart, getMonthStart } from "@/lib/inventory";
import { stringifyWeekTemplateCsv } from "@/lib/inventoryBulk";

/**
 * Admin page for setting menu availability: how many of each product
 * can be ordered per week or month. Prevents overselling.
 */
export default function AdminAvailabilityPage() {
	const [slots, setSlots] = useState<InventorySlot[]>([]);
	const [menuItems, setMenuItems] = useState<{ id: string; name: string }[]>([]);
	const [loading, setLoading] = useState(true);
	const now = new Date();
	const [form, setForm] = useState({
		item_id: "",
		period_type: "week" as "week" | "month",
		period_start: getWeekStart(now),
		quantity_available: 0,
	});
	const [saving, setSaving] = useState(false);
	const [bulkMessage, setBulkMessage] = useState<string | null>(null);
	const [bulkError, setBulkError] = useState<string | null>(null);
	const [bulkBusy, setBulkBusy] = useState(false);

	useEffect(() => {
		const key = sessionStorage.getItem("admin_key") ?? "";
		if (!key) {
			window.location.href = "/admin/login";
			return;
		}
		const headers = { "x-admin-key": key };

		Promise.all([
			fetch("/api/admin/inventory", { headers }).then((r) => r.json()),
			fetch("/api/menu").then((r) => r.json()),
		])
			.then(([slotsData, menuData]) => {
				setSlots(Array.isArray(slotsData) ? slotsData : []);
				const items = (menuData?.items ?? []).map((i: { id: string; name: string }) => ({
					id: i.id,
					name: i.name,
				}));
				setMenuItems(items);
			})
			.finally(() => setLoading(false));
	}, []);

	function adminHeaders(): HeadersInit {
		const key = sessionStorage.getItem("admin_key") ?? "";
		return { "x-admin-key": key };
	}

	function triggerDownload(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function downloadExport(format: "csv" | "json") {
		setBulkError(null);
		setBulkMessage(null);
		setBulkBusy(true);
		try {
			const res = await fetch(`/api/admin/inventory/export?format=${format}`, {
				headers: adminHeaders(),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				setBulkError((err as { error?: string }).error ?? `Download failed (${res.status})`);
				return;
			}
			const blob = await res.blob();
			const fromHeader = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1];
			const fallback = `inventory-slots.${format === "csv" ? "csv" : "json"}`;
			triggerDownload(blob, fromHeader ?? fallback);
			setBulkMessage(`Downloaded ${format.toUpperCase()} — edit offline, then upload below.`);
		} finally {
			setBulkBusy(false);
		}
	}

	function downloadWeekTemplate() {
		setBulkError(null);
		setBulkMessage(null);
		const ws = getWeekStart(now);
		const csv = stringifyWeekTemplateCsv(
			menuItems.map((m) => ({ item_id: m.id, item_name: m.name })),
			ws
		);
		triggerDownload(
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
			`availability-week-template-${ws}.csv`
		);
		setBulkMessage(
			`Template uses this week’s start (${ws}). Set quantities in the last column, save as CSV, then upload.`
		);
	}

	async function uploadBulkFile(file: File) {
		setBulkError(null);
		setBulkMessage(null);
		const key = sessionStorage.getItem("admin_key") ?? "";
		if (!key) {
			window.location.href = "/admin/login";
			return;
		}
		setBulkBusy(true);
		try {
			const text = await file.text();
			const isJson = file.name.toLowerCase().endsWith(".json");
			const res = await fetch("/api/admin/inventory/bulk", {
				method: "POST",
				headers: {
					"x-admin-key": key,
					"Content-Type": isJson ? "application/json" : "text/csv",
				},
				body: text,
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setBulkError((data as { error?: string }).error ?? `Upload failed (${res.status})`);
				return;
			}
			const d = data as { created?: number; updated?: number; errors?: { index: number; message: string }[] };
			const errs = d.errors ?? [];
			const parts = [`${d.created ?? 0} created`, `${d.updated ?? 0} updated`];
			setBulkMessage(parts.join(", ") + ".");
			if (errs.length > 0) {
				const preview = errs
					.slice(0, 5)
					.map((e) => `row ${e.index + 1}: ${e.message}`)
					.join("; ");
				setBulkError(
					`${errs.length} row(s) failed (${preview}${errs.length > 5 ? "…" : ""}). Successful rows were still saved.`
				);
			}
			const headers = { "x-admin-key": key };
			const slotsRes = await fetch("/api/admin/inventory", { headers });
			if (slotsRes.ok) {
				const slotsData = await slotsRes.json();
				setSlots(Array.isArray(slotsData) ? slotsData : []);
			}
		} finally {
			setBulkBusy(false);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const key = sessionStorage.getItem("admin_key") ?? "";
		setSaving(true);
		const res = await fetch("/api/admin/inventory", {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-admin-key": key },
			body: JSON.stringify(form),
		});
		setSaving(false);
		if (res.ok) {
			const data = await res.json();
			setSlots((prev) => {
				const idx = prev.findIndex(
					(s) =>
						s.item_id === data.item_id &&
						s.period_type === data.period_type &&
						s.period_start === data.period_start
				);
				if (idx >= 0) {
					const next = [...prev];
					next[idx] = data;
					return next;
				}
				return [data, ...prev];
			});
			setForm({
				item_id: "",
				period_type: "week",
				period_start: getWeekStart(now),
				quantity_available: 0,
			});
		}
	}

	const weekStart = getWeekStart(now);
	const monthStart = getMonthStart(now);

	if (loading) {
		return (
			<main className="mx-auto max-w-5xl px-4 py-6">
				<p className="text-sage">Loading...</p>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-5xl px-4 py-6">
			<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Menu availability</h1>
			<p className="mb-6 text-sm text-sage">
				Set how many of each product customers can order per week or month. This prevents overselling.
			</p>

			<section className="card-warm mb-8 p-6 sm:p-8">
				<h2 className="mb-2 font-display text-lg font-semibold text-cocoa">Bulk edit (CSV or JSON)</h2>
				<p className="mb-4 text-sm text-sage">
					Download current limits or a blank week template, edit in Excel or another editor, then upload. The CSV
					from &quot;Download CSV&quot; includes sold counts for reference; only the limit column is applied on
					import.
				</p>
				<div className="mb-4 flex flex-wrap gap-2">
					<button
						type="button"
						disabled={bulkBusy}
						onClick={() => downloadExport("csv")}
						className="btn-secondary"
					>
						Download CSV
					</button>
					<button
						type="button"
						disabled={bulkBusy}
						onClick={() => downloadExport("json")}
						className="btn-secondary"
					>
						Download JSON
					</button>
					<button
						type="button"
						disabled={bulkBusy || menuItems.length === 0}
						onClick={downloadWeekTemplate}
						className="btn-secondary"
					>
						Week template (all items)
					</button>
				</div>
				<label className="block">
					<span className="mb-1.5 block text-sm font-medium text-cocoa">Upload CSV or JSON</span>
					<input
						type="file"
						accept=".csv,.json,text/csv,application/json"
						disabled={bulkBusy}
						onChange={(e) => {
							const f = e.target.files?.[0];
							e.target.value = "";
							if (f) void uploadBulkFile(f);
						}}
						className="input-base max-w-md cursor-pointer text-sm file:mr-3 file:rounded file:border-0 file:bg-honey file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-caramel"
					/>
				</label>
				{bulkMessage && (
					<p className="mt-3 text-sm text-success" role="status">
						{bulkMessage}
					</p>
				)}
				{bulkError && (
					<p className="mt-3 text-sm text-berry" role="alert">
						{bulkError}
					</p>
				)}
			</section>

			<section className="card-warm mb-8 p-6 sm:p-8">
				<h2 className="mb-4 font-display text-lg font-semibold text-cocoa">Add or update</h2>
				<form onSubmit={handleSubmit} className="grid max-w-md gap-4">
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Menu item</div>
						<select
							value={form.item_id}
							onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
							required
							className="input-base"
						>
							<option value="">Select item</option>
							{menuItems.map((i) => (
								<option key={i.id} value={i.id}>
									{i.name}
								</option>
							))}
						</select>
					</label>
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Period type</div>
						<select
							value={form.period_type}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									period_type: e.target.value as "week" | "month",
									period_start: e.target.value === "week" ? weekStart : monthStart,
								}))
							}
							className="input-base"
						>
							<option value="week">Week</option>
							<option value="month">Month</option>
						</select>
					</label>
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Period start (YYYY-MM-DD)</div>
						<input
							type="date"
							value={form.period_start}
							onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
							required
							className="input-base"
						/>
					</label>
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Quantity available</div>
						<input
							type="number"
							min={0}
							value={form.quantity_available || ""}
							onChange={(e) =>
								setForm((f) => ({ ...f, quantity_available: Number(e.target.value) || 0 }))
							}
							required
							className="input-base"
						/>
					</label>
					<button
						type="submit"
						disabled={saving || !form.item_id || !form.period_start}
						className="btn-primary"
					>
						{saving ? "Saving..." : "Save"}
					</button>
				</form>
			</section>

			<section>
				<h2 className="mb-3 font-display text-lg font-semibold text-cocoa">Current availability</h2>
				{slots.length === 0 ? (
					<p className="text-sage">No availability set yet. Add one above to start selling.</p>
				) : (
					<div className="overflow-x-auto rounded-card border border-crust bg-wheat/50 shadow-soft">
						<table className="w-full min-w-[520px] border-collapse text-left text-sm">
							<thead>
								<tr className="border-b border-crust bg-cream/90">
									<th scope="col" className="px-4 py-3 font-display font-semibold text-cocoa">
										Item
									</th>
									<th scope="col" className="px-4 py-3 font-display font-semibold text-cocoa">
										Period
									</th>
									<th scope="col" className="px-4 py-3 font-display font-semibold text-cocoa">
										Starts
									</th>
									<th scope="col" className="px-4 py-3 font-display font-semibold text-cocoa">
										Sold / limit
									</th>
								</tr>
							</thead>
							<tbody>
								{slots.map((s) => (
									<tr key={s.id} className="border-b border-crust/80 last:border-0 hover:bg-cream/40">
										<td className="px-4 py-3 font-medium text-cocoa">
											{menuItems.find((m) => m.id === s.item_id)?.name ?? s.item_id}
										</td>
										<td className="px-4 py-3 capitalize text-sage">{s.period_type}</td>
										<td className="px-4 py-3 tabular-nums text-cocoa">{s.period_start}</td>
										<td className="px-4 py-3 tabular-nums text-cocoa">
											<span className="font-medium text-caramel">{s.quantity_sold}</span>
											<span className="text-sage"> / </span>
											{s.quantity_available}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</main>
	);
}
