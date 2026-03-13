"use client";

import { useEffect } from "react";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log to error reporting service in production
		if (process.env.NODE_ENV === "production") {
			console.error("[ErrorBoundary]", error.message);
		}
	}, [error]);

	return (
		<div style={{ padding: 24, textAlign: "center" }}>
			<h2>Something went wrong</h2>
			<p style={{ color: "#6b7280", marginBottom: 16 }}>Please try again.</p>
			<button
				onClick={reset}
				style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #111827", background: "#111827", color: "#fff" }}
			>
				Try again
			</button>
		</div>
	);
}
