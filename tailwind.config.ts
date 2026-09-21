import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#09090b',
          hover: '#1a1a1a',
        },
        secondary: {
          DEFAULT: '#00b7d7',
        },
        tertiary: {
          DEFAULT: '#ff2357',
        },
        surface: {
          DEFAULT: '#ffffff',
          container: '#e9ecef',
          hover: '#e0e0e0',
          lowest: '#f4f4f5',
        },
        border: {
          DEFAULT: '#d0d0d0',
        }
      },
      boxShadow: {
        'card': '0 3px 8px rgba(0, 0, 0, 0.15)',
        'dropdown': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'input-focus': '0 0 0 2px rgba(9, 9, 11, 0.1)',
      },
      fontFamily: {
        sans: ['Pretendard', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
export default config
