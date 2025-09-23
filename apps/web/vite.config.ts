import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

const ReactCompilerConfig = {};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@dafthunk/types": path.resolve(__dirname, "../../packages/types/src"),
      "lucide-react/icons": path.resolve(
        __dirname,
        "node_modules/lucide-react/dist/esm/icons"
      ),
    },
  },
});
