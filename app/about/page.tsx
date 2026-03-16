import Link from "next/link";
import {
	getAboutContent,
	toInstagramUrl,
	toTiktokUrl,
	toFacebookUrl,
} from "@/lib/aboutContent";

export default async function AboutPage() {
	const content = await getAboutContent();
	const { about, howToOrder, contact } = content;

	const phoneDigits = contact.phone?.replace(/\D/g, "") ?? "";
	const instagramUrl = contact.instagram ? toInstagramUrl(contact.instagram) : "";
	const facebookUrl = contact.facebook ? toFacebookUrl(contact.facebook) : "";
	const tiktokUrl = contact.tiktok ? toTiktokUrl(contact.tiktok) : "";

	const hasAbout =
		about.story || about.howWeBake || about.whoWeAre || about.values;
	const hasHowToOrder =
		howToOrder.intro ||
		howToOrder.steps.length > 0 ||
		howToOrder.pickupLocation ||
		howToOrder.pickupHours ||
		howToOrder.leadTime ||
		howToOrder.payment;
	const hasContact =
		contact.email || contact.phone || contact.instagram || contact.facebook || contact.tiktok;

	return (
		<div className="mx-auto max-w-2xl">
			<Link
				href="/"
				className="mb-6 inline-block text-cocoa transition-colors hover:text-honey"
			>
				← Back to menu
			</Link>
			<h1 className="mb-8 font-display text-3xl font-semibold text-cocoa">
				About Little Town Bakes
			</h1>

			{hasAbout && (
				<section className="mb-10">
					<h2 className="mb-4 font-display text-xl font-semibold text-cocoa">
						Our Story
					</h2>
					<div className="flex flex-col gap-4 rounded-card border border-crust bg-wheat p-5 shadow-soft sm:p-6">
						{about.story && (
							<p className="text-cocoa">{about.story}</p>
						)}
						{about.howWeBake && (
							<p className="text-cocoa">{about.howWeBake}</p>
						)}
						{about.whoWeAre && (
							<p className="text-cocoa">{about.whoWeAre}</p>
						)}
						{about.values && (
							<p className="text-cocoa">{about.values}</p>
						)}
					</div>
				</section>
			)}

			{hasHowToOrder && (
				<section className="mb-10">
					<h2 className="mb-4 font-display text-xl font-semibold text-cocoa">
						How to Order
					</h2>
					<div className="flex flex-col gap-4 rounded-card border border-crust bg-wheat p-5 shadow-soft sm:p-6">
						{howToOrder.intro && (
							<p className="text-cocoa">{howToOrder.intro}</p>
						)}
						{howToOrder.steps.length > 0 && (
							<ol className="list-inside list-decimal space-y-2 text-cocoa">
								{howToOrder.steps.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ol>
						)}
						{(howToOrder.pickupLocation ||
							howToOrder.pickupHours ||
							howToOrder.leadTime ||
							howToOrder.payment) && (
							<dl className="grid gap-2 text-sm">
								{howToOrder.pickupLocation && (
									<>
										<dt className="font-medium text-caramel">
											Pickup location
										</dt>
										<dd className="text-cocoa">
											{howToOrder.pickupLocation}
										</dd>
									</>
								)}
								{howToOrder.pickupHours && (
									<>
										<dt className="font-medium text-caramel">
											Pickup hours
										</dt>
										<dd className="text-cocoa">
											{howToOrder.pickupHours}
										</dd>
									</>
								)}
								{howToOrder.leadTime && (
									<>
										<dt className="font-medium text-caramel">
											Lead time
										</dt>
										<dd className="text-cocoa">
											{howToOrder.leadTime}
										</dd>
									</>
								)}
								{howToOrder.payment && (
									<>
										<dt className="font-medium text-caramel">
											Payment
										</dt>
										<dd className="text-cocoa">
											{howToOrder.payment}
										</dd>
									</>
								)}
							</dl>
						)}
					</div>
				</section>
			)}

			{hasContact && (
				<section>
					<h2 className="mb-4 font-display text-xl font-semibold text-cocoa">
						Contact
					</h2>
					<div className="flex flex-wrap gap-4 rounded-card border border-crust bg-wheat p-5 shadow-soft sm:p-6">
						{contact.email && (
							<a
								href={`mailto:${contact.email}`}
								className="text-cocoa underline-offset-2 hover:text-honey hover:underline"
							>
								{contact.email}
							</a>
						)}
						{phoneDigits && contact.phone && (
							<a
								href={`tel:${phoneDigits}`}
								className="text-cocoa underline-offset-2 hover:text-honey hover:underline"
							>
								{contact.phone}
							</a>
						)}
						{instagramUrl && (
							<a
								href={instagramUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-cocoa underline-offset-2 hover:text-honey hover:underline"
							>
								Instagram
							</a>
						)}
						{facebookUrl && (
							<a
								href={facebookUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-cocoa underline-offset-2 hover:text-honey hover:underline"
							>
								Facebook
							</a>
						)}
						{tiktokUrl && (
							<a
								href={tiktokUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-cocoa underline-offset-2 hover:text-honey hover:underline"
							>
								TikTok
							</a>
						)}
					</div>
				</section>
			)}

			{!hasAbout && !hasHowToOrder && !hasContact && (
				<p className="text-sage">
					Content coming soon. Edit{" "}
					<code className="rounded bg-crust px-1 py-0.5 text-sm">
						public/about.json
					</code>{" "}
					to add your story, ordering info, and contact details. See{" "}
					<code className="rounded bg-crust px-1 py-0.5 text-sm">
						CONTENT_ABOUT.md
					</code>{" "}
					for prompts.
				</p>
			)}
		</div>
	);
}
