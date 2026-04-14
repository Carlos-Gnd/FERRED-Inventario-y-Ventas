// El renderer no usa Tailwind — este archivo evita que Vite
// suba carpetas y encuentre el postcss.config.js del proyecto padre (FERRRED-SYNC)
// que sí requiere tailwindcss y no está instalado aquí.
export default {
  plugins: {},
};