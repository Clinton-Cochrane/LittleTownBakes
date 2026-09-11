/**
 * Public admin route wrapper. Protected pages add their navigation through
 * the authenticated route-group layout; the login page intentionally does not.
 * Inherits fonts and theme from root layout.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return <div className="min-h-[60vh]">{children}</div>;
}
