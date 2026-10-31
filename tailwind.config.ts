import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0a0a12",
        panel: "#141426",
        neon: "#00ff9c",
        magenta: "#ff2ec4",
        cyanx: "#00e5ff",
        gold: "#ffd319",
      },
      fontFamily: {
        pixel: ["'Press Start 2P'", "monospace"],
        body: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        pixel: "4px 4px 0 0 #00ff9c",
      },
    },
  },
  plugins: [],
};
export default config;
