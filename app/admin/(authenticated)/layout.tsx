import { AdminNavigation } from "@/components/admin/AdminNavigation";

/** Shared shell for admin pages that require an authenticated admin session. */
export default function AuthenticatedAdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-[60vh]">
			<AdminNavigation />
			{children}
		</div>
	);
}
