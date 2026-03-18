"use client";
import { useState } from "react";

export default function AdminLogin() {
	const [key, setKey] = useState("");
	return (
		<main className="mx-auto max-w-md px-4 py-8">
			<div className="card-warm p-6 sm:p-8">
				<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Admin Login</h1>
				<p className="mb-4 text-sm text-sage">Enter admin key to continue</p>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						sessionStorage.setItem("admin_key", key.trim());
						window.location.href = "/admin/orders";
					}}
					className="grid gap-4"
				>
					<label>
						<span className="sr-only">Admin key</span>
						<input
							type="password"
							value={key}
							onChange={(e) => setKey(e.target.value)}
							placeholder="Admin key"
							className="input-base"
							autoComplete="current-password"
						/>
					</label>
					<button type="submit" className="btn-primary">
						Continue
					</button>
				</form>
			</div>
		</main>
	);
}
