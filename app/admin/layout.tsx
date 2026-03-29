import Link from "next/link";
import { CalendarNavIcon, ChatNavIcon, OrdersNavIcon } from "@/components/icons/navIcons";

/**
 * Admin layout: provides bakery-themed navigation for all admin pages.
 * Inherits fonts and theme from root layout.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
	const linkClass =
		"inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-cocoa transition-colors hover:bg-cream/80 hover:text-caramel";

	return (
		<div className="min-h-[60vh]">
			<nav
				className="border-b border-amber-200/80 bg-gradient-to-r from-wheat via-peach-mist/60 to-parchment"
				aria-label="Admin"
			>
				<div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<div className="flex flex-wrap items-center gap-2 sm:gap-4">
						<Link
							href="/admin/orders"
							className="font-display text-lg font-semibold text-cocoa transition-colors hover:text-caramel"
						>
							Admin
						</Link>
						<div className="flex flex-wrap gap-1 sm:gap-2">
							<Link href="/admin/orders" className={linkClass}>
								<OrdersNavIcon className="text-caramel" size={18} />
								Orders
							</Link>
							<Link href="/admin/availability" className={linkClass}>
								<CalendarNavIcon className="text-caramel" size={18} />
								Availability
							</Link>
							<Link href="/admin/flavor-requests" className={linkClass}>
								<ChatNavIcon className="text-caramel" size={18} />
								Flavor requests
							</Link>
						</div>
					</div>
					<Link
						href="/"
						className="text-sm text-caramel/90 transition-colors hover:text-caramel hover:underline"
					>
						← Back to site
					</Link>
				</div>
			</nav>
			{children}
		</div>
	);
}
