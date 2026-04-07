import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f4f7fb',
        paper: '#ffffff',
        ink: '#14213d',
        muted: '#5c6b84',
        border: '#d6dfec',
        brand: {
          50: '#ebf5ff',
          100: '#d7eaff',
          200: '#b3d8ff',
          300: '#7cbcff',
          400: '#4f9dff',
          500: '#2c7fff',
          600: '#1b63de',
          700: '#194fb1',
          800: '#1b458f',
          900: '#1d3b74',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(24, 74, 151, 0.08)',
        card: '0 20px 50px rgba(23, 42, 73, 0.08)',
      },
      backgroundImage: {
        'hero-mesh':
          'radial-gradient(circle at 14% -10%, rgba(44, 127, 255, 0.28), transparent 44%), radial-gradient(circle at 78% 0%, rgba(20, 146, 130, 0.22), transparent 42%), linear-gradient(135deg, #f4f7fb 10%, #ebf5ff 50%, #f8fbff 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [forms],
}

