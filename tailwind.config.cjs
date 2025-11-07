module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    './node_modules/heroui/dist/esm/index.js',
  ],
  theme: { extend: {} },
  plugins: [ require('heroui/plugin') ],
}