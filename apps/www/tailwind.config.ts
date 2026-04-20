import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", "Inter", "sans-serif"],
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "rgb(75 85 99)",
            "--tw-prose-headings": "rgb(17 24 39)",
            "--tw-prose-lead": "rgb(75 85 99)",
            "--tw-prose-links": "rgb(17 24 39)",
            "--tw-prose-bold": "rgb(17 24 39)",
            "--tw-prose-counters": "rgb(107 114 128)",
            "--tw-prose-bullets": "rgb(156 163 175)",
            "--tw-prose-hr": "rgb(229 231 235)",
            "--tw-prose-quotes": "rgb(17 24 39)",
            "--tw-prose-quote-borders": "rgb(229 231 235)",
            "--tw-prose-captions": "rgb(107 114 128)",
            "--tw-prose-code": "rgb(17 24 39)",
            "--tw-prose-pre-code": "rgb(17 24 39)",
            "--tw-prose-pre-bg": "rgb(255 255 255)",
            "--tw-prose-th-borders": "rgb(209 213 219)",
            "--tw-prose-td-borders": "rgb(229 231 235)",
            fontSize: "1.125rem",
            lineHeight: "1.75",
            h1: {
              fontWeight: "300",
              fontSize: "3rem",
              letterSpacing: "-0.02em",
              marginBottom: "1.5rem",
            },
            h2: {
              fontWeight: "300",
              fontSize: "1.875rem",
              letterSpacing: "-0.01em",
              marginTop: "3rem",
              marginBottom: "1rem",
              scrollMarginTop: "5rem",
            },
            h3: {
              fontWeight: "400",
              fontSize: "1.5rem",
              marginTop: "2rem",
              marginBottom: "0.75rem",
              scrollMarginTop: "5rem",
            },
            h4: {
              fontWeight: "500",
              fontSize: "1.125rem",
              marginTop: "1.5rem",
              marginBottom: "0.5rem",
              scrollMarginTop: "5rem",
            },
            a: {
              textDecoration: "underline",
              fontWeight: "400",
              "&:hover": { textDecoration: "none" },
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            code: {
              backgroundColor: "rgb(243 244 246)",
              padding: "0.125rem 0.375rem",
              borderRadius: "0.25rem",
              fontWeight: "500",
              fontSize: "0.9em",
            },
            table: {
              fontSize: "1rem",
            },
            thead: {
              borderBottomColor: "rgb(209 213 219)",
            },
            "tbody tr": {
              borderBottomColor: "rgb(229 231 235)",
            },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;
