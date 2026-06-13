/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#000000',
        'primary-hover': '#1a1a1a',
        secondary: '#5e5e5e',
        surface: '#f9f9f9',
        'surface-bright': '#ffffff',
        'surface-container': '#eeeeee',
        'surface-container-low': '#f3f3f3',
        'surface-container-high': '#e8e8e8',
        'surface-container-highest': '#e2e2e2',
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#4c4546',
        outline: '#7e7576',
        'outline-variant': '#cfc4c5',
        'on-primary': '#ffffff',
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '6px',
        lg: '10px',
        xl: '14px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
