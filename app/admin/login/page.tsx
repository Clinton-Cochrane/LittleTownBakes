import { isLocalMode, LOCAL_ADMIN_EMAIL, LOCAL_ADMIN_PASSWORD } from "@/lib/localMode";

export default async function AdminLogin({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const { error } = await searchParams;
	const localMode = isLocalMode();
	const message = error === "forbidden"
		? "This account is not authorized for admin access."
		: error === "invalid"
			? "Invalid email or password."
			: null;

	return (
		<main className="mx-auto max-w-md px-4 py-8">
			<div className="card-warm p-6 sm:p-8">
				<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Admin Login</h1>
				<p className="mb-4 text-sm text-sage">Sign in with your bakery admin account</p>
				{localMode && (
					<p className="mb-4 rounded-lg border border-crust bg-cream px-4 py-3 text-sm text-cocoa" role="status">
						Local login: <strong>{LOCAL_ADMIN_EMAIL}</strong> / <strong>{LOCAL_ADMIN_PASSWORD}</strong>
					</p>
				)}
				{message && <p className="mb-4 rounded-lg bg-berry/10 px-4 py-2 text-sm text-berry" role="alert">{message}</p>}
				<form action="/auth/signin" method="post" className="grid gap-4">
					<label>
						<span className="mb-1.5 block text-sm font-medium text-cocoa">Email</span>
						<input name="email" type="email" defaultValue={localMode ? LOCAL_ADMIN_EMAIL : ""} autoComplete="email" required className="input-base" />
					</label>
					<label>
						<span className="mb-1.5 block text-sm font-medium text-cocoa">Password</span>
						<input name="password" type="password" defaultValue={localMode ? LOCAL_ADMIN_PASSWORD : ""} autoComplete="current-password" required className="input-base" />
					</label>
					<button type="submit" className="btn-primary">Sign in</button>
				</form>
			</div>
		</main>
	);
}
