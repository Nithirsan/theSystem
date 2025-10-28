/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#1173d4",
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "card-light": "#ffffff",
        "card-dark": "#192734",
        "text-light-primary": "#1f2937",
        "text-dark-primary": "#f9fafb",
        "text-light-secondary": "#6b7280",
        "text-dark-secondary": "#9ca3af",
        "border-light": "#e5e7eb",
        "border-dark": "#374151",
        "secondary": "#68D391",
        "accent": "#F6AD55",
        "priority-high": "#FF6B6B",
        "priority-medium": "#FFD166",
        "priority-low": "#06D6A0"
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "full": "9999px"
      },
      animation: {
        'bounce': 'bounce 1s infinite',
      }
    },
  },
  plugins: [],
  safelist: [
    'bg-primary',
    'bg-secondary', 
    'bg-accent',
    'bg-priority-high',
    'bg-priority-medium',
    'bg-priority-low',
    'text-primary',
    'text-secondary',
    'text-accent',
    'bg-primary/20',
    'bg-secondary/20',
    'bg-accent/20',
    'bg-primary/30',
    'bg-secondary/30',
    'bg-accent/30'
  ]
}