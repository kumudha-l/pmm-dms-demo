/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fff2ed",
          500: "#f04e30",
          600: "#db4428",
          700: "#b63620",
        },
        slatebrand: "#1e1e1e",
      },
      boxShadow: {
        panel: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
