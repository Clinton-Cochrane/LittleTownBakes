"use client";
import { useState, useMemo, useEffect } from "react";

export type CheckoutData = {
	name: string;
	email: string;
	phone?: string;
	notes?: string;
	paymentMethod: "venmo" | "cash";
	venmoUser?: string;
	venmoNote?: string;
};

type Props = {
	onSubmit: (data: CheckoutData) => void;
	onPaymentMethodChange?: (method: "venmo" | "cash") => void;
};

export default function CheckoutForm({ onSubmit, onPaymentMethodChange }: Props) {
	const [form, setForm] = useState<CheckoutData>({
		name: "",
		email: "",
		paymentMethod: "venmo",
	});

	useEffect(() => {
		onPaymentMethodChange?.(form.paymentMethod);
	}, [form.paymentMethod, onPaymentMethodChange]);

	const isValid = useMemo(() => {
		const contactValid =
			form.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
		const venmoValid =
			form.paymentMethod === "cash" ||
			(form.venmoUser?.trim() ?? "").length > 0;
		return contactValid && venmoValid;
	}, [form]);

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

			<fieldset className="space-y-3">
				<legend className="mb-2 text-sm font-medium text-cocoa">Payment method *</legend>
				<div className="flex gap-6">
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="radio"
							name="paymentMethod"
							value="venmo"
							checked={form.paymentMethod === "venmo"}
							onChange={() => setForm((s) => ({ ...s, paymentMethod: "venmo" }))}
							className="h-4 w-4 accent-honey"
						/>
						<span className="text-cocoa">Venmo</span>
					</label>
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="radio"
							name="paymentMethod"
							value="cash"
							checked={form.paymentMethod === "cash"}
							onChange={() => setForm((s) => ({ ...s, paymentMethod: "cash" }))}
							className="h-4 w-4 accent-honey"
						/>
						<span className="text-cocoa">Cash</span>
					</label>
				</div>
			</fieldset>

			{form.paymentMethod === "venmo" && (
				<div className="grid gap-4 rounded-lg border border-crust bg-wheat/50 p-4">
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Your Venmo @username *</div>
						<input
							value={form.venmoUser ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, venmoUser: e.target.value }))}
							placeholder="@username"
							className="input-base"
						/>
					</label>
					<label>
						<div className="mb-1.5 text-sm font-medium text-cocoa">Payment note (optional)</div>
						<input
							value={form.venmoNote ?? ""}
							onChange={(e) => setForm((s) => ({ ...s, venmoNote: e.target.value }))}
							placeholder="Order # or item description"
							className="input-base"
						/>
					</label>
				</div>
			)}
		</form>
	);
}
