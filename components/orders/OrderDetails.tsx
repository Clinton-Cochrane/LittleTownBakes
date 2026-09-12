import type { PublicOrderTracking } from "@/lib/orderTypes";
import { formatCurrency } from "@/lib/menuCatalog";
import { formatPickupWindow } from "@/lib/pickupWindows";

export default function OrderDetails({ order }: { order: PublicOrderTracking }) {
	const isAwaitingPayment = order.payment.status === "PENDING";

	return (
		<main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
			<h1 className="mb-6 font-display text-3xl font-semibold text-cocoa">Order #{order.publicOrderNumber}</h1>
			{isAwaitingPayment && (
				<div className="mb-6 rounded-lg border border-crust bg-wheat p-4">
					<p className="font-semibold text-cocoa">Order placed!</p>
					<p className="mt-2 text-sm text-cocoa/80">
						Payment is pending. The baker will update it after manually confirming {order.payment.method} payment.
					</p>
				</div>
			)}
			<div className="mb-6 rounded-lg border border-crust bg-wheat px-4 py-3">
				<span className="text-muted">Status:</span>{" "}
				<strong className="text-cocoa">{order.fulfillmentStatus.replaceAll("_", " ")}</strong>
				<span className="ml-4 text-muted">Payment:</span>{" "}
				<strong className="text-cocoa">{order.payment.status}</strong>
			</div>
			{order.pickup && (
				<div className="mb-6 rounded-lg border border-crust bg-wheat px-4 py-3 text-cocoa">
					<span className="text-muted">Pickup:</span>{" "}
					<strong>{formatPickupWindow(order.pickup)}</strong>
					<span className="ml-2 text-sm text-muted">Pacific Time</span>
				</div>
			)}

			<section>
				{order.items.map((i, index) => (
					<div key={`${i.productId}-${index}`} className="mb-2 grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-crust bg-wheat p-4">
						<div>
							<div className="font-semibold text-cocoa">{i.name}</div>
							<div className="text-xs text-muted">{formatCurrency(i.unitPriceCents / 100)} × {i.quantity}</div>
						</div>
						<div className="text-right font-semibold text-cocoa">{formatCurrency(i.lineTotalCents / 100)}</div>
					</div>
				))}
				<div className="mt-4 flex justify-between font-semibold text-cocoa">
					<span className="text-muted">Total</span>
					<span>{formatCurrency(order.totals.totalCents / 100)}</span>
				</div>
			</section>
		</main>
	);
}
