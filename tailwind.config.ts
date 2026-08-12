import type { Config } from "tailwindcss"
import animate from "tailwindcss-animate"
import viderePreset from "./packages/ui/tailwind.preset"

const config: Config = {
  presets: [viderePreset],
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./packages/ui/src/**/*.{ts,tsx,js,jsx}",
  ],
  plugins: [animate],
}
export default config
