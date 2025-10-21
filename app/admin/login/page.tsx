"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
	const [key, setKey] = useState("");
	const router = useRouter();
	return (
		<main style={{ maxWidth: 420, margin: "0 auto", padding: 16 }}>
			<h1>Admin Login</h1>
			<p style={{ color: "#6b7280" }}>Enter admin key</p>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					sessionStorage.setItem("admin_key", key);
					router.push("/admin/orders");
				}}
			>
				<input
					value={key}
					onChange={(e) => setKey(e.target.value)}
					style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
				/>
				<button style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, border: "1px solid #111827" }}>
					Continue
				</button>
			</form>
		</main>
	);
}
