/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'system-ui', 'sans-serif'],
        latin: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#edf9f8',
          100: '#d5f1ee',
          200: '#afe2dd',
          300: '#7bcac3',
          400: '#45aaa3',
          500: '#238d87',
          600: '#0d766f',
          700: '#0e5f5a',
          800: '#104c49',
          900: '#103f3d',
        },
        ink: '#112923',
        lapis: '#1d4e89',
        porcelain: '#f4f7f6',
        saffron: '#e6a533',
      },
    },
  },
  plugins: [],
};
