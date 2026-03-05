/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        punk: {
          purple: '#8B5CF6',
          pink: '#EC4899',
          dark: '#0F0B1A',
          darker: '#080510',
        },
      },
    },
  },
  plugins: [],
}
