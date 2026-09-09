"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (new URLSearchParams(window.location.search).get("error") === "forbidden") {
			setError("This account is not authorized for admin access.");
		}
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		const supabase = createClient();
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		if (signInError) {
			setError("Invalid email or password.");
			setLoading(false);
			return;
		}

		const { data, error: claimsError } = await supabase.auth.getClaims();
		const appMetadata = data?.claims?.app_metadata;
		const isAdmin =
			!claimsError &&
			typeof appMetadata === "object" &&
			appMetadata !== null &&
			(appMetadata as { role?: unknown }).role === "admin";

		if (!isAdmin) {
			await supabase.auth.signOut();
			setError("This account is not authorized for admin access.");
			setLoading(false);
			return;
		}

		window.location.assign("/admin/orders");
	}

	return (
		<main className="mx-auto max-w-md px-4 py-8">
			<div className="card-warm p-6 sm:p-8">
				<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Admin Login</h1>
				<p className="mb-4 text-sm text-sage">Sign in with your bakery admin account</p>
				{error && (
					<p className="mb-4 rounded-lg bg-berry/10 px-4 py-2 text-sm text-berry" role="alert">
						{error}
					</p>
				)}
				<form onSubmit={handleSubmit} className="grid gap-4">
					<label>
						<span className="mb-1.5 block text-sm font-medium text-cocoa">Email</span>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							required
							className="input-base"
						/>
					</label>
					<label>
						<span className="mb-1.5 block text-sm font-medium text-cocoa">Password</span>
						<input
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="current-password"
							required
							className="input-base"
						/>
					</label>
					<button type="submit" disabled={loading} className="btn-primary">
						{loading ? "Signing in..." : "Sign in"}
					</button>
				</form>
			</div>
		</main>
	);
}
