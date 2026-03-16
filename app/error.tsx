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
		if (process.env.NODE_ENV === "production") {
			console.error("[ErrorBoundary]", error.message);
		}
	}, [error]);

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12 text-center">
			<h2 className="mb-2 font-display text-2xl font-semibold text-cocoa">Something went wrong</h2>
			<p className="mb-6 text-sage">Please try again.</p>
			<button onClick={reset} className="btn-primary">
				Try again
			</button>
		</div>
	);
}
