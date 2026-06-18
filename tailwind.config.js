/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          navy: '#1E3A8A',
          'navy-light': '#1E40AF',
          sky: '#EFF6FF',
          orange: '#EA580C',
          'orange-hover': '#C2410C',
          border: '#BFDBFE',
        }
      }
    },
  },
  plugins: [],
}