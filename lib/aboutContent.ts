import { readFile } from "fs/promises";
import { join } from "path";

export type AboutSection = {
	story: string;
	howWeBake: string;
	whoWeAre: string;
	values: string;
};

export type HowToOrderSection = {
	intro: string;
	steps: string[];
	pickupLocation: string;
	pickupHours: string;
	leadTime: string;
	payment: string;
};

export type ContactSection = {
	email: string;
	phone: string;
	instagram: string;
	facebook: string;
	tiktok: string;
};

export type AboutContent = {
	about: AboutSection;
	howToOrder: HowToOrderSection;
	contact: ContactSection;
};

const emptyAbout: AboutContent = {
	about: { story: "", howWeBake: "", whoWeAre: "", values: "" },
	howToOrder: {
		intro: "",
		steps: [],
		pickupLocation: "",
		pickupHours: "",
		leadTime: "",
		payment: "",
	},
	contact: { email: "", phone: "", instagram: "", facebook: "", tiktok: "" },
};

/**
 * Load about.json from public folder. Returns empty defaults on error.
 */
export async function getAboutContent(): Promise<AboutContent> {
	try {
		const path = join(process.cwd(), "public", "about.json");
		const raw = await readFile(path, "utf-8");
		const data = JSON.parse(raw) as Partial<AboutContent>;

		return {
			about: {
				story: String(data?.about?.story ?? "").trim(),
				howWeBake: String(data?.about?.howWeBake ?? "").trim(),
				whoWeAre: String(data?.about?.whoWeAre ?? "").trim(),
				values: String(data?.about?.values ?? "").trim(),
			},
			howToOrder: {
				intro: String(data?.howToOrder?.intro ?? "").trim(),
				steps: Array.isArray(data?.howToOrder?.steps)
					? data.howToOrder.steps.map((s) => String(s ?? "").trim()).filter(Boolean)
					: [],
				pickupLocation: String(data?.howToOrder?.pickupLocation ?? "").trim(),
				pickupHours: String(data?.howToOrder?.pickupHours ?? "").trim(),
				leadTime: String(data?.howToOrder?.leadTime ?? "").trim(),
				payment: String(data?.howToOrder?.payment ?? "").trim(),
			},
			contact: {
				email: String(data?.contact?.email ?? "").trim(),
				phone: String(data?.contact?.phone ?? "").trim(),
				instagram: String(data?.contact?.instagram ?? "").trim(),
				facebook: String(data?.contact?.facebook ?? "").trim(),
				tiktok: String(data?.contact?.tiktok ?? "").trim(),
			},
		};
	} catch (e) {
		console.error("[getAboutContent]", e);
		return emptyAbout;
	}
}

export function toInstagramUrl(handle: string): string {
	const s = handle.replace(/^@/, "").trim();
	return s ? `https://instagram.com/${s}` : "";
}

export function toTiktokUrl(handle: string): string {
	const s = handle.replace(/^@/, "").trim();
	return s ? `https://tiktok.com/@${s}` : "";
}

export function toFacebookUrl(value: string): string {
	const s = value.trim();
	if (!s) return "";
	if (s.startsWith("http://") || s.startsWith("https://")) return s;
	return `https://facebook.com/${s.replace(/^\//, "")}`;
}
