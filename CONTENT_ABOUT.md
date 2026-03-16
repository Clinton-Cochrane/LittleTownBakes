# About Page Content Guide

Edit `public/about.json` to customize the About page. Use valid JSON. Empty strings hide that field or section.

## About Section

- **story** — How did Little Town Bakes start? What inspired you? What does "little town" mean to you?
- **howWeBake** — Describe your approach: small-batch, local ingredients, seasonal flavors, etc.
- **whoWeAre** — A short personal note (optional).
- **values** — What you care about: quality, community, sustainability, etc.

## How to Order Section

- **intro** — A brief intro to your ordering process.
- **steps** — Array of strings, e.g. `["Browse the menu and add items to your cart.", "Check out and pay via Venmo.", "Pick up at the specified time and location."]`
- **pickupLocation** — Where customers pick up orders.
- **pickupHours** — When pickup is available.
- **leadTime** — How far in advance to order (e.g. "Order by Thursday for Saturday pickup").
- **payment** — Payment methods (e.g. "Venmo at checkout").

## Contact Section

- **email** — Your email (shown as mailto link).
- **phone** — Your phone number (shown as tel link).
- **instagram** — Instagram handle, with or without @ (e.g. `@LittleTownBakes` or `LittleTownBakes`).
- **facebook** — Full URL or page name (e.g. `https://facebook.com/LittleTownBakes` or `LittleTownBakes`).
- **tiktok** — TikTok handle, with or without @.

Leave any field as `""` to hide it from the page.
