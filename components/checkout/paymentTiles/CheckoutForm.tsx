"use client";
import { useState, useMemo } from "react";

export type CheckoutData = {
	name: string;
	email: string;
	phone?: string;
	notes?: string;
	venmoUser?: string;
	venmoNote?: string;
};

export default function CheckoutForm({ onSubmit }: { onSubmit: (data: CheckoutData) => void }) {
	const [form, setForm] = useState<CheckoutData>({ name: "", email: "" });
	const isValid = useMemo(
		() => form.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
		[form]
	);
	return (
		<form
			id="checkout-form"
			onSubmit={(e) => {
				e.preventDefault();
				if (isValid) onSubmit(form);
			}}
			style={{ display: "grid", gap: 8 }}
		>
				<label>
					<div style={{ marginBottom: 4 }}>Name *</div>
					<input
						value={form.name}
						onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
						required
						minLength={2}
						style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
					/>
				</label>
				<label>
					<div style={{ marginBottom: 4 }}>Email *</div>
					<input
						type="email"
						value={form.email}
						onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
						required
						style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
					/>
				</label>
				<label>
					<div style={{ marginBottom: 4 }}>Phone (optional)</div>
					<input
						type="tel"
						value={form.phone ?? ""}
						onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
						style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
					/>
				</label>
			<label>
				<div style={{ marginBottom: 4 }}>Order notes (optional)</div>
				<textarea
					value={form.notes ?? ""}
					onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
					style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
				/>
			</label>
			<details>
				<summary style={{ cursor: "pointer" }}>Venmo details (optional)</summary>
				<div style={{ display: "grid", gap: 8, marginTop: 8 }}>
					<label>
						<div style={{ marginBottom: 4 }}>Your Venmo @username</div>
						<input
							value={form.venmoUser ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, venmoUser: e.target.value }))}
							style={{ display: "grid", gap: 8, marginTop: 8 }}
						/>
					</label>

					<label>
						<div style={{ marginBottom: 4 }}>Payment note</div>
						<input
							value={form.venmoNote ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, venmoNote: e.target.value }))}
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						/>
					</label>
				</div>
			</details>

			<button
				type="submit"
				style={{
					marginTop: 8,
					padding: "10px 12px",
					borderRadius: 8,
					border: "1px solid #111827",
					background: "#111827",
					color: "#fff",
				}}
				disabled={!isValid}
			>
				Continue
			</button>
		</form>
	);
}
