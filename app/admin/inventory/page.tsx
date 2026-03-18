"use client";

import { useEffect, useState } from "react";
import type { InventorySlot } from "@/lib/inventory";
import { getWeekStart, getMonthStart } from "@/lib/inventory";

export default function AdminInventoryPage() {
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
			<main className="mx-auto max-w-3xl px-4 py-6">
				<p className="text-sage">Loading...</p>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-6 font-display text-2xl font-semibold text-cocoa">Inventory</h1>

			<section className="card-warm mb-8 p-6 sm:p-8">
				<h2 className="mb-4 font-display text-lg font-semibold text-cocoa">Add or update slot</h2>
				<form onSubmit={handleSubmit} className="grid max-w-md gap-4">
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Item</div>
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
				<h2 className="mb-4 font-display text-lg font-semibold text-cocoa">Current slots</h2>
				{slots.length === 0 ? (
					<p className="text-sage">No inventory slots yet. Add one above.</p>
				) : (
					<div className="flex flex-col gap-3">
						{slots.map((s) => (
							<div
								key={s.id}
								className="card-warm grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
							>
								<span>
									<strong className="text-cocoa">
										{menuItems.find((m) => m.id === s.item_id)?.name ?? s.item_id}
									</strong>
								</span>
								<span className="text-sage">{s.period_type}</span>
								<span className="text-sage">{s.period_start}</span>
								<span className="text-cocoa">
									{s.quantity_sold} / {s.quantity_available} sold
								</span>
							</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
