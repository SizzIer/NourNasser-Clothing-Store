/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        secondaryBrown: "#A78BFA",
      },
      fontFamily: {
        brand: ["Outfit", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: ["@tailwindcss/forms"],
};
