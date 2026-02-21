/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          hover: "hsl(var(--primary-hover) / <alpha-value>)"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)"
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)"
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)"
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)"
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)"
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
        },
        footer: {
          DEFAULT: "hsl(var(--footer-bg) / <alpha-value>)",
          foreground: "hsl(var(--footer-foreground) / <alpha-value>)"
        },
        brand: {
          1: "hsl(var(--brand-1) / <alpha-value>)",
          2: "hsl(var(--brand-2) / <alpha-value>)",
          3: "hsl(var(--brand-3) / <alpha-value>)",
          4: "hsl(var(--brand-4) / <alpha-value>)",
          5: "hsl(var(--brand-5) / <alpha-value>)",
          50: "hsl(var(--brand-50) / <alpha-value>)",
          100: "hsl(var(--brand-100) / <alpha-value>)",
          200: "hsl(var(--brand-200) / <alpha-value>)",
          300: "hsl(var(--brand-300) / <alpha-value>)",
          400: "hsl(var(--brand-400) / <alpha-value>)",
          500: "hsl(var(--brand-500) / <alpha-value>)",
          600: "hsl(var(--brand-600) / <alpha-value>)",
          700: "hsl(var(--brand-700) / <alpha-value>)",
          800: "hsl(var(--brand-800) / <alpha-value>)",
          900: "hsl(var(--brand-900) / <alpha-value>)"
        },
        /* Legacy palettes – aligned with Hunger Hankerings logo (magenta/pink, light green, orange) */
        sage_green: {
          DEFAULT: "#8bc34a",
          50: "#f1f8e9",
          100: "#dcedc8",
          200: "#c5e1a5",
          300: "#aed581",
          400: "#9ccc65",
          500: "#8bc34a",
          600: "#7cb342",
          700: "#689f38",
          800: "#558b2f",
          900: "#33691e"
        },
        apricot_cream: {
          DEFAULT: "#fad4dc",
          50: "#fef5f7",
          100: "#fde8ec",
          200: "#fad4dc",
          300: "#f5b3c1",
          400: "#ed8fa3",
          500: "#e66b85",
          600: "#d94a6b",
          700: "#b83d5a",
          800: "#93324a",
          900: "#7a2a3e"
        },
        cherry_rose: {
          DEFAULT: "#e91e8c",
          50: "#fdf2f9",
          100: "#fce4f3",
          200: "#f8bbdf",
          300: "#f48fc9",
          400: "#f062b3",
          500: "#ec407a",
          600: "#e91e63",
          700: "#d81b60",
          800: "#c2185b",
          900: "#ad1457"
        },
        yellow_green: {
          DEFAULT: "#9ccc65",
          50: "#f1f8e9",
          100: "#dcedc8",
          200: "#c5e1a5",
          300: "#aed581",
          400: "#9ccc65",
          500: "#8bc34a",
          600: "#7cb342",
          700: "#689f38",
          800: "#558b2f",
          900: "#33691e"
        },
        cotton_candy: {
          DEFAULT: "#ec407a",
          50: "#fdf2f9",
          100: "#fce4f3",
          200: "#f8bbdf",
          300: "#f48fc9",
          400: "#f062b3",
          500: "#ec407a",
          600: "#e91e63",
          700: "#d81b60",
          800: "#c2185b",
          900: "#ad1457"
        },
        light_coral: {
          DEFAULT: "#ff9800",
          50: "#fff3e0",
          100: "#ffe0b2",
          200: "#ffcc80",
          300: "#ffb74d",
          400: "#ffa726",
          500: "#ff9800",
          600: "#fb8c00",
          700: "#f57c00",
          800: "#ef6c00",
          900: "#e65100"
        },
        blush_rose: {
          DEFAULT: "#f48fb1",
          50: "#fef5f7",
          100: "#fde8ec",
          200: "#fad4dc",
          300: "#f5b3c1",
          400: "#ed8fa3",
          500: "#e66b85",
          600: "#d94a6b",
          700: "#b83d5a",
          800: "#93324a",
          900: "#7a2a3e"
        },
        /* New palette: Cherry Blossom, Powder Petal, Dust Grey, Ash Grey, Iron Grey */
        cherry_blossom: {
          DEFAULT: "#EDAFB8",
          50: "#FDF2F4",
          100: "#FAE4E8",
          200: "#EDAFB8"
        },
        powder_petal: {
          DEFAULT: "#F7E1D7",
          50: "#FDF8F6",
          100: "#F7E1D7",
          200: "#F0D4C8"
        },
        dust_grey: {
          DEFAULT: "#DEDBD2",
          50: "#F5F4F2",
          100: "#EDEBE8",
          200: "#DEDBD2"
        },
        ash_grey: {
          DEFAULT: "#B0C4B1",
          100: "#E8F0E9",
          200: "#D4E3D5",
          500: "#B0C4B1",
          600: "#8FA890",
          700: "#6B8F6D"
        },
        iron_grey: {
          DEFAULT: "#4A5759"
        }
      }
    }
  },
  plugins: []
}
