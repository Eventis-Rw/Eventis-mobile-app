/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#f5f3ff",
          dark: "#0c0c1a",
        },
        foreground: {
          DEFAULT: "#0c0c1a",
          dark: "#f0f0ff",
        },
        card: {
          DEFAULT: "#ffffff",
          dark: "#13131f",
          foreground: {
            DEFAULT: "#0c0c1a",
            dark: "#f0f0ff",
          },
        },
        primary: {
          DEFAULT: "#7c3aed",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f0eeff",
          dark: "#1e1e2e",
          foreground: {
            DEFAULT: "#4c1d95",
            dark: "#a78bfa",
          },
        },
        muted: {
          DEFAULT: "#ede9fe",
          dark: "#1a1a2e",
          foreground: {
            DEFAULT: "#6b7280",
            dark: "#9ca3af",
          },
        },
        accent: {
          DEFAULT: "#f59e0b",
          foreground: {
            DEFAULT: "#ffffff",
            dark: "#0c0c1a",
          },
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: {
          DEFAULT: "#e0d9ff",
          dark: "#2a2a4a",
        },
        input: {
          DEFAULT: "#ede9fe",
          dark: "#1e1e2e",
        },
        tint: {
          DEFAULT: "#7c3aed",
          dark: "#a78bfa",
        },
        success: "#10b981",
        warning: "#f59e0b",
        info: "#3b82f6",
        surface: {
          DEFAULT: "rgba(255,255,255,0.9)",
          dark: "rgba(19,19,31,0.92)",
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.25)",
          dark: "rgba(255,255,255,0.07)",
        },
        overlay: {
          DEFAULT: "rgba(12,12,26,0.5)",
          dark: "rgba(0,0,0,0.75)",
        },
      },
      borderRadius: {
        DEFAULT: "16px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
