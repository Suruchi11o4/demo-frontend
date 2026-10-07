/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1E3A8A',
          dark: '#172554',
          light: '#1E40AF',
        },
        primaryBlue: '#2563EB',
        groundingGreen: '#059669',
        firewallRed: '#DC2626',
        fusionPurple: '#7C3AED',
        approvalAmber: '#D97706',
        canvasBg: '#F5F7FB',
      },
      fontFamily: {
        serif: ['Lora', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
