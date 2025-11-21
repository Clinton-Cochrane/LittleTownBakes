/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cocoa: "#5b3b2a",
                sugarPink: "#ffe4ef",
                berryPink: "#f9739a",
                frosting: "#fff7fb",
                sprinkleBlue: "#9fd5ff",
            },
            boxShadow: {
                "soft-card": "0 10px 25px rgba(0,0,0,0.05)",
            },
        },
    },
    plugins: [],
};
