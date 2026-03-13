"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
		]).then(([slotsData, menuData]) => {
			setSlots(Array.isArray(slotsData) ? slotsData : []);
			const items = (menuData?.items ?? []).map((i: { id: string; name: string }) => ({ id: i.id, name: i.name }));
			setMenuItems(items);
		}).finally(() => setLoading(false));
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
					(s) => s.item_id === data.item_id && s.period_type === data.period_type && s.period_start === data.period_start
				);
				if (idx >= 0) {
					const next = [...prev];
					next[idx] = data;
					return next;
				}
				return [data, ...prev];
			});
			setForm({ item_id: "", period_type: "week", period_start: "", quantity_available: 0 });
		}
	}

	const weekStart = getWeekStart(now);
	const monthStart = getMonthStart(now);

	if (loading) {
		return (
			<main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
				<p>Loading...</p>
			</main>
		);
	}

	return (
		<main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<h1>Inventory</h1>
				<div style={{ display: "flex", gap: 12 }}>
					<Link href="/admin/orders" style={{ color: "#111827" }}>
						Orders
					</Link>
					<Link href="/admin/flavor-requests" style={{ color: "#111827" }}>
						Flavor Requests
					</Link>
				</div>
			</div>

			<section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
				<h2 style={{ marginBottom: 12 }}>Add or update slot</h2>
				<form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 400 }}>
					<label>
						<div style={{ marginBottom: 4 }}>Item</div>
						<select
							value={form.item_id}
							onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
							required
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
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
						<div style={{ marginBottom: 4 }}>Period type</div>
						<select
							value={form.period_type}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									period_type: e.target.value as "week" | "month",
									period_start: e.target.value === "week" ? weekStart : monthStart,
								}))
							}
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						>
							<option value="week">Week</option>
							<option value="month">Month</option>
						</select>
					</label>
					<label>
						<div style={{ marginBottom: 4 }}>Period start (YYYY-MM-DD)</div>
						<input
							type="date"
							value={form.period_start}
							onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
							required
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						/>
					</label>
					<label>
						<div style={{ marginBottom: 4 }}>Quantity available</div>
						<input
							type="number"
							min={0}
							value={form.quantity_available || ""}
							onChange={(e) => setForm((f) => ({ ...f, quantity_available: Number(e.target.value) || 0 }))}
							required
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						/>
					</label>
					<button
						type="submit"
						disabled={saving || !form.item_id || !form.period_start}
						style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #111827", background: "#111827", color: "#fff" }}
					>
						{saving ? "Saving..." : "Save"}
					</button>
				</form>
			</section>

			<section>
				<h2 style={{ marginBottom: 12 }}>Current slots</h2>
				{slots.length === 0 ? (
					<p style={{ color: "#6b7280" }}>No inventory slots yet. Add one above.</p>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{slots.map((s) => (
							<div
								key={s.id}
								style={{
									display: "grid",
									gridTemplateColumns: "1fr auto auto auto",
									gap: 12,
									alignItems: "center",
									padding: 12,
									border: "1px solid #e5e7eb",
									borderRadius: 8,
								}}
							>
								<span>
									<strong>{menuItems.find((m) => m.id === s.item_id)?.name ?? s.item_id}</strong>
								</span>
								<span>{s.period_type}</span>
								<span>{s.period_start}</span>
								<span>
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
