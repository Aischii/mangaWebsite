/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './routes/**/*.js',
    './app.js',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f1220',
        surface: '#15182a',
        surface2: '#1a1f34',
        brand: '#5b7cfa',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
};

