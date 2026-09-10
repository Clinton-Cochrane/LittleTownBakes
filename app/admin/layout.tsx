import { AdminNavigation } from "@/components/admin/AdminNavigation";

/**
 * Admin layout: provides bakery-themed navigation for all admin pages.
 * Inherits fonts and theme from root layout.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-[60vh]">
			<AdminNavigation />
			{children}
		</div>
	);
}
