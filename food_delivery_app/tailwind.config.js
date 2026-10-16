/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./web/**/*.{html,js}", "./components/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        // SmartSoko unified design tokens - reference CSS custom properties
        primary: 'var(--os-primary)',
        primary-dark: 'var(--os-primary-dark)',
        primary-light: 'var(--os-primary-light)',
        secondary: 'var(--os-terra)',
        accent: 'var(--os-amber)',
        surface: {
          DEFAULT: 'var(--os-cream)',
          variant: 'var(--os-taupe)',
        },
        background: 'var(--os-cream)',
        'on-primary': '#FFFFFF',
        'on-surface': {
          DEFAULT: 'var(--os-charcoal)',
          variant: 'var(--os-gray)',
        },
        outline: 'var(--os-gray)',
        error: 'var(--os-error)',
        success: 'var(--os-success)',
        warning: 'var(--os-warning)',
      },
      fontFamily: {
        headline: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': 'var(--radius-lg)',
        'lg': 'var(--radius-xl)',
        'xl': 'clamp(2rem, 5vw, 3rem)',
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