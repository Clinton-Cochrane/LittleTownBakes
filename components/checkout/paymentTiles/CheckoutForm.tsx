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
			className="grid gap-5"
		>
			<label>
				<div className="mb-1.5 text-sm font-medium text-cocoa">Name *</div>
				<input
					value={form.name}
					onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
					required
					minLength={2}
					className="input-base"
				/>
			</label>
			<label>
				<div className="mb-1.5 text-sm font-medium text-cocoa">Email *</div>
				<input
					type="email"
					value={form.email}
					onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
					required
					className="input-base"
				/>
			</label>
			<label>
				<div className="mb-1.5 text-sm font-medium text-cocoa">Phone (optional)</div>
				<input
					type="tel"
					value={form.phone ?? ""}
					onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
					className="input-base"
				/>
			</label>
			<label>
				<div className="mb-1.5 text-sm font-medium text-cocoa">Order notes (optional)</div>
				<textarea
					value={form.notes ?? ""}
					onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
					className="input-base min-h-20 resize-y"
				/>
			</label>
			<details className="group">
				<summary className="cursor-pointer text-sm font-medium text-cocoa hover:text-honey">
					Venmo details (optional)
				</summary>
				<div className="mt-4 grid gap-4">
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Your Venmo @username</div>
						<input
							value={form.venmoUser ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, venmoUser: e.target.value }))}
							className="input-base"
						/>
					</label>
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Payment note</div>
						<input
							value={form.venmoNote ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, venmoNote: e.target.value }))}
							className="input-base"
						/>
					</label>
				</div>
			</details>

			<button type="submit" disabled={!isValid} className="btn-primary mt-2">
				Continue
			</button>
		</form>
	);
}
