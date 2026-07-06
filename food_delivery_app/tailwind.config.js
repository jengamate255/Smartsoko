/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./web/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#012d1d', // Organic Curator Primary (Deep forest green)
          dark: '#002114',
          light: '#c1ecd4',
        },
        secondary: '#934b00', // Organic Curator Secondary
        accent: '#fd8603',
        surface: {
          DEFAULT: '#fbf9f5', // Organic Curator Surface
          variant: '#efeeea',
        },
        background: '#fbf9f5',
        'on-primary': '#ffffff',
        'on-surface': {
          DEFAULT: '#1b1c1a',
          variant: '#414844',
        },
        outline: '#717973',
        error: '#ba1a1a',
        success: '#16a34a',
        warning: '#f59e0b',
      },
      fontFamily: {
        headline: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Be Vietnam Pro', 'sans-serif'],
        label: ['Be Vietnam Pro', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '1rem',
        'lg': '2rem',
        'xl': '3rem',
      },
    },
  },
  plugins: [],
}