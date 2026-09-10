import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import {
	MenuNavIcon,
	OrdersNavIcon,
	PastFlavorsNavIcon,
} from "@/components/icons/navIcons";

const links = [
	{ href: "/admin/orders", label: "Orders", Icon: OrdersNavIcon },
	{ href: "/admin/menu", label: "Menu", Icon: MenuNavIcon },
	{ href: "/admin/inventory", label: "Inventory", Icon: MenuNavIcon },
	{ href: "/admin/availability", label: "Pickup", Icon: OrdersNavIcon },
	{ href: "/admin/menu?view=past", label: "Past Flavors", Icon: PastFlavorsNavIcon },
];

function NavigationLinks() {
	return (
		<>
			{links.map(({ href, label, Icon }) => (
				<Link
					key={href}
					href={href}
					className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-cocoa transition-colors hover:bg-cream/80 hover:text-caramel"
				>
					<Icon className="text-caramel" size={18} />
					{label}
				</Link>
			))}
		</>
	);
}

export function AdminNavigation() {
	return (
		<nav
			className="border-b border-amber-200/80 bg-gradient-to-r from-wheat via-peach-mist/60 to-parchment"
			aria-label="Admin"
		>
			<div className="mx-auto max-w-5xl px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6">
				<div className="flex items-center justify-between gap-3">
					<Link
						href="/admin/orders"
						className="font-display text-lg font-semibold text-cocoa transition-colors hover:text-caramel"
					>
						Admin
					</Link>
					<details className="relative sm:hidden">
						<summary className="flex min-h-11 cursor-pointer list-none items-center rounded-button border border-crust bg-cream px-4 font-medium text-cocoa marker:content-none">
							Navigation
						</summary>
						<div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-1 rounded-card border border-crust bg-cream p-2 shadow-card">
							<NavigationLinks />
							<div className="border-t border-crust px-3 pt-2"><LogoutButton /></div>
						</div>
					</details>
				</div>
				<div className="hidden items-center gap-1 sm:flex">
					<NavigationLinks />
					<div className="ml-2 border-l border-crust pl-3"><LogoutButton /></div>
				</div>
			</div>
		</nav>
	);
}
