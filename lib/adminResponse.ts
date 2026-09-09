export function handleAdminAuthFailure(response: Response): string | null {
	if (response.status === 401) {
		window.location.assign("/admin/login");
		return "Your session has expired. Please log in again.";
	}
	if (response.status === 403) {
		return "You are signed in, but this account is not authorized for admin access.";
	}
	return null;
}
