/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        savo: {
          purple: {
            DEFAULT: '#782B90',
            dark: '#581F6A',
            light: '#9837B5',
            muted: '#F5EBF8',
            surface: '#2B0E35',
          },
          yellow: {
            DEFAULT: '#FFF200',
            hover: '#E5D900',
            light: '#FFFBE6',
            accent: '#D4C900',
          }
        }
      }
    },
  },
  plugins: [],
}
