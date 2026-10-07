import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#17243a", muted: "#68768c", line: "#e4eaf2", paper: "#ffffff", canvas: "#f6f8fc", blue: "#3559d8", pale: "#edf2ff" }, boxShadow: { card: "0 8px 28px rgba(20,38,75,.05)" } } }, plugins: [] } satisfies Config;
