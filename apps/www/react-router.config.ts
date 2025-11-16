import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  buildDirectory: "build",
  serverBuildFile: "index.js",
  ssr: true,
  future: {
    unstable_viteEnvironmentApi: true,
  },
  routes: "./src/routes.ts",
} satisfies Config;
