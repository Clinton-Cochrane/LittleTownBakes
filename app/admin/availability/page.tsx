"use client";

import { useEffect, useState } from "react";
import { handleAdminAuthFailure } from "@/lib/adminResponse";
import { formatPickupWindow, toPacificFormValues } from "@/lib/pickupWindows";

type PickupWindowRow = { id: string; start_at: string; end_at: string; enabled: boolean };
type WindowForm = { date: string; startTime: string; endTime: string };
const EMPTY_FORM: WindowForm = { date: "", startTime: "", endTime: "" };

export default function AdminAvailabilityPage() {
	const [windows, setWindows] = useState<PickupWindowRow[]>([]);
	const [form, setForm] = useState<WindowForm>(EMPTY_FORM);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	async function loadWindows() {
		const response = await fetch("/api/admin/pickup-windows", { cache: "no-store" });
		if (!response.ok) {
			setError(handleAdminAuthFailure(response) ?? `Failed to load pickup windows (${response.status}).`);
			return;
		}
		setWindows(await response.json());
	}

	useEffect(() => { void loadWindows().finally(() => setLoading(false)); }, []);

	function beginEdit(window: PickupWindowRow) {
		const start = toPacificFormValues(window.start_at);
		const end = toPacificFormValues(window.end_at);
		setEditingId(window.id);
		setForm({ date: start.date, startTime: start.time, endTime: end.time });
		setError(null);
		setMessage(null);
	}

	function cancelEdit() {
		setEditingId(null);
		setForm(EMPTY_FORM);
	}

	async function saveWindow(event: React.FormEvent) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		setMessage(null);
		const idBeingEdited = editingId;
		const response = await fetch(idBeingEdited ? `/api/admin/pickup-windows/${idBeingEdited}` : "/api/admin/pickup-windows", {
			method: idBeingEdited ? "PATCH" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form),
		});
		setSaving(false);
		if (!response.ok) {
			const result = await response.json().catch(() => ({}));
			setError(handleAdminAuthFailure(response) ?? result.error ?? `Could not save pickup window (${response.status}).`);
			return;
		}
		cancelEdit();
		setMessage(idBeingEdited ? "Pickup window updated." : "Pickup window created.");
		await loadWindows();
	}

	async function toggleWindow(window: PickupWindowRow) {
		setError(null);
		setMessage(null);
		const response = await fetch(`/api/admin/pickup-windows/${window.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ enabled: !window.enabled }),
		});
		if (!response.ok) {
			const result = await response.json().catch(() => ({}));
			setError(handleAdminAuthFailure(response) ?? result.error ?? `Could not update pickup window (${response.status}).`);
			return;
		}
		setMessage(window.enabled ? "Pickup window disabled." : "Pickup window enabled.");
		await loadWindows();
	}

	if (loading) return <main className="mx-auto max-w-4xl px-4 py-6"><p className="text-sage">Loading...</p></main>;

	return (
		<main className="mx-auto max-w-4xl px-4 py-6">
			<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Pickup availability</h1>
			<p className="mb-6 text-sm text-sage">Create concrete pickup windows. All dates and times are Pacific Time.</p>
			{error && <p className="mb-4 rounded-lg bg-berry/10 px-4 py-2 text-berry" role="alert">{error}</p>}
			{message && <p className="mb-4 text-sm text-success" role="status">{message}</p>}

			<section className="card-warm mb-8 p-6 sm:p-8">
				<h2 className="mb-4 font-display text-lg font-semibold text-cocoa">{editingId ? "Edit pickup window" : "Add pickup window"}</h2>
				<form onSubmit={saveWindow} className="grid gap-4 sm:grid-cols-3">
					<label><span className="mb-1.5 block text-sm font-medium text-cocoa">Date</span>
						<input type="date" required value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="input-base" />
					</label>
					<label><span className="mb-1.5 block text-sm font-medium text-cocoa">Start time</span>
						<input type="time" step={60} required value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="input-base" />
					</label>
					<label><span className="mb-1.5 block text-sm font-medium text-cocoa">End time</span>
						<input type="time" step={60} required value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="input-base" />
					</label>
					<div className="flex flex-wrap gap-2 sm:col-span-3">
						<button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : editingId ? "Save changes" : "Add window"}</button>
						{editingId && <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button>}
					</div>
				</form>
			</section>

			<section>
				<h2 className="mb-3 font-display text-lg font-semibold text-cocoa">Pickup windows</h2>
				{windows.length === 0 ? <p className="text-sage">No pickup windows configured.</p> : (
					<div className="space-y-3">
						{windows.map((window) => (
							<div key={window.id} className="card-warm flex flex-wrap items-center justify-between gap-3 p-4">
								<div className="text-cocoa">
									<span className="font-medium">{formatPickupWindow({ startAt: window.start_at, endAt: window.end_at }, "short")}</span>
									<span className={`ml-3 text-sm ${window.enabled ? "text-success" : "text-sage"}`}>{window.enabled ? "Enabled" : "Disabled"}</span>
								</div>
								<div className="flex gap-2">
									<button type="button" onClick={() => beginEdit(window)} className="btn-secondary">Edit</button>
									<button type="button" onClick={() => void toggleWindow(window)} className={window.enabled ? "btn-danger" : "btn-primary"}>{window.enabled ? "Disable" : "Enable"}</button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
