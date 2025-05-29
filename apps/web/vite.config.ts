import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import path from "path";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";

const ReactCompilerConfig = {};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        providerImportSource: "@mdx-js/react",
        remarkPlugins: [remarkGfm],
      }),
    },
    react({
      include: /\.(mdx|js|jsx|ts|tsx|mdx)$/,
      babel: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@dafthunk/types": path.resolve(__dirname, "../../packages/types/src"),
    },
  },
});
