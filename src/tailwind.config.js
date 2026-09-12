/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          50: '#f2f9f4',
          100: '#e1f2e6',
          200: '#c3e5ce',
          300: '#97d2ab',
          400: '#64b681',
          500: '#3e9960',
          600: '#2d7a4b',
          700: '#26613d',
          800: '#1b4332',
          900: '#17392b',
          950: '#0b2018',
        },
        earth: {
          50: '#faf8f5',
          100: '#f4efe8',
          200: '#e8ded4',
          300: '#d7c4b0',
          400: '#be9e7f',
          500: '#aa815d',
          600: '#936a4c',
          700: '#7a543e',
          800: '#654637',
          900: '#533b30',
        },
        harvest: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'farmer': '0 4px 20px -2px rgba(27, 67, 50, 0.12), 0 2px 6px -1px rgba(27, 67, 50, 0.08)',
        'farmer-lg': '0 10px 30px -4px rgba(27, 67, 50, 0.16), 0 4px 10px -2px rgba(27, 67, 50, 0.08)',
      }
    },
  },
  plugins: [],
}
