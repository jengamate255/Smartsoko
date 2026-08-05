/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./web/**/*.{html,js}", "./components/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#064e3b',
          dark: '#043020',
          light: '#d1fae5',
        },
        secondary: '#059669',
        accent: '#fd8603',
        surface: {
          DEFAULT: '#f8faf6',
          variant: '#ecfdf5',
        },
        background: '#f8faf6',
        'on-primary': '#ffffff',
        'on-surface': {
          DEFAULT: '#022d1d',
          variant: '#64748b',
        },
        outline: '#cbd5e1',
        error: '#b91c1c',
        success: '#059669',
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
  plugins: [
    function({ addBase, theme }) {
      addBase({
        ':root': {
          '--sb-primary': theme('colors.accent'),
        },
      });
    },
    require('tailwindcss/plugins/forms'),
    require('tailwindcss/plugins/container-queries'),
  ],
}
