"use client";

type Props = { venmoHandle: string };
export default function VenmoTile({ venmoHandle }: Props) {
	return (
		<div
			style={{
				border: "1px solid #e5e7eb",
				borderRadius: 12,
				padding: 16,
				display: "grid",
				gridTemplateColumns: "96px 1fr",
				gap: 12,
			}}
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/venmo-qr.png"
				alt="Venmo QR"
				style={{ width: 96, height: 96, borderRadius: 8, background: "#f3f4f6" }}
			/>
			<div>
				<div style={{ fontWeight: 700 }}>Pay with Venmo</div>
				<div style={{ color: "#6b7280", marginBottom: 8 }}>
					Scan or send to <strong>{venmoHandle}</strong>.
				</div>
				<div style={{ display: "flex", gap: 8 }}>
					<button
						onClick={() => navigator.clipboard?.writeText(venmoHandle)}
						style={{
							padding: "8px 12px",
							borderRadius: 8,
							border: "1px solid #111827",
							background: "#111827",
							color: "#fff",
						}}
					>
						Copy Handle
					</button>
					<a
						href={`https://venmo.com/${venmoHandle.replace("@", "")}`}
						target="_blank"
						rel="noreferrer"
						style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #111827", textDecoration: "none" }}
					>
						Open Venmo
					</a>
				</div>
			</div>
		</div>
	);
}
