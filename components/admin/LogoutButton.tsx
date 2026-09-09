"use client";

import { usePathname } from "next/navigation";

export function LogoutButton() {
	const pathname = usePathname();
	if (pathname === "/admin/login") return null;

	return (
		<form action="/auth/signout" method="post">
			<button
				type="submit"
				className="text-sm text-caramel/90 transition-colors hover:text-caramel hover:underline"
			>
				Logout
			</button>
		</form>
	);
}
