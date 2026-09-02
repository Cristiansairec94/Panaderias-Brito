import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bakery: {
          50: "#fff8f1",
          100: "#feeedc",
          200: "#fcd9b6",
          300: "#f9bd85",
          400: "#f59751",
          500: "#f07727",
          600: "#e15c1d",
          700: "#bb4419",
          800: "#95381c",
          900: "#79301a",
          950: "#41160a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
