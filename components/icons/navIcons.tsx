type IconProps = { className?: string; size?: number };

function iconSize(size: number | undefined) {
	return size ?? 20;
}

export function HomeNavIcon({ className = "text-caramel", size }: IconProps) {
	const s = iconSize(size);
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="m3 10 9-7 9 7" />
			<path d="M5 9v11h14V9M9 20v-6h6v6" />
		</svg>
	);
}

export function MenuNavIcon({ className = "text-caramel", size }: IconProps) {
	const s = iconSize(size);
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M4 20v-8a8 8 0 0 1 16 0v8H4Z" />
			<path d="M8 9.5 10 12M13 7l1.5 3M16 10l2 2" />
		</svg>
	);
}

export function PastFlavorsNavIcon({ className = "text-caramel", size }: IconProps) {
	const s = iconSize(size);
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
			<path d="M3 3v5h5M12 7v5l3 2" />
		</svg>
	);
}

export function OrdersNavIcon({ className = "text-honey", size }: IconProps) {
	const s = iconSize(size);
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
			<line x1="3" y1="6" x2="21" y2="6" />
			<path d="M16 10a4 4 0 0 1-8 0" />
		</svg>
	);
}

export function CalendarNavIcon({ className = "text-honey", size }: IconProps) {
	const s = iconSize(size);
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
	);
}

export function ChatNavIcon({ className = "text-honey", size }: IconProps) {
	const s = iconSize(size);
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
	);
}

export function SettingsNavIcon({ className = "text-honey", size }: IconProps) {
	const s = iconSize(size);
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<circle cx="12" cy="12" r="3" />
			<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
		</svg>
	);
}
