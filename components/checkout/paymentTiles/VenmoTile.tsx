"use client";

type Props = { venmoHandle: string };

export default function VenmoTile({ venmoHandle }: Props) {
	return (
		<div className="flex flex-col gap-5 rounded-lg border border-crust bg-wheat p-5 sm:flex-row sm:items-start sm:p-6">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/venmo-qr.png"
				alt="Venmo QR"
				className="h-24 w-24 shrink-0 self-center rounded-lg bg-cream object-cover sm:self-start"
			/>
			<div className="min-w-0 flex-1">
				<div className="font-display font-semibold text-cocoa">Pay with Venmo</div>
				<div className="mb-3 text-sm text-sage">
					Scan or send to <strong className="text-cocoa">{venmoHandle}</strong>.
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						onClick={() => navigator.clipboard?.writeText(venmoHandle)}
						className="btn-primary"
					>
						Copy Handle
					</button>
					<a
						href={`https://venmo.com/${venmoHandle.replace("@", "")}`}
						target="_blank"
						rel="noreferrer"
						className="btn-secondary"
					>
						Open Venmo
					</a>
				</div>
			</div>
		</div>
	);
}
