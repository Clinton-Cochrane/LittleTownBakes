"use client";

import { useState } from "react";

type DemandSignalButtonProps = { productId: string; label: string; className?: string };

export function DemandSignalButton({ productId, label, className = "btn-secondary" }: DemandSignalButtonProps) {
	const [pending, setPending] = useState(false);
	const [currentCount, setCurrentCount] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function submit() {
		if (pending) return;
		setPending(true);
		setError(null);
		try {
			const response = await fetch("/api/demand-signals", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ productId }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.error ?? "Could not save your response.");
			setCurrentCount(body.currentDemandCount);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not save your response.");
		} finally {
			setPending(false);
		}
	}

	return (
		<div>
			<button type="button" onClick={() => void submit()} disabled={pending} className={className}>
				{pending ? "Saving…" : label}
			</button>
			{currentCount !== null && <p role="status" className="mt-2 text-sm font-medium text-success motion-safe:animate-pulse">Thanks for the signal! {currentCount} this period.</p>}
			{error && <p role="alert" className="mt-2 text-sm text-berry">{error}</p>}
		</div>
	);
}
