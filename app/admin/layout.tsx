import Link from "next/link";

/**
 * Admin layout: provides bakery-themed navigation for all admin pages.
 * Inherits fonts and theme from root layout.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-[60vh]">
			<nav className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-crust bg-wheat px-4 py-3 sm:px-6">
				<div className="flex items-center gap-4">
					<Link
						href="/admin/orders"
						className="font-display text-lg font-semibold text-cocoa transition-colors hover:text-honey"
					>
						Admin
					</Link>
					<div className="flex gap-4 text-sm">
						<Link href="/admin/orders" className="text-cocoa transition-colors hover:text-honey hover:underline">
							Orders
						</Link>
						<Link href="/admin/inventory" className="text-cocoa transition-colors hover:text-honey hover:underline">
							Inventory
						</Link>
						<Link href="/admin/flavor-requests" className="text-cocoa transition-colors hover:text-honey hover:underline">
							Flavor Requests
						</Link>
					</div>
				</div>
				<Link href="/" className="text-sm text-sage transition-colors hover:text-honey">
					← Back to site
				</Link>
			</nav>
			{children}
		</div>
	);
}
