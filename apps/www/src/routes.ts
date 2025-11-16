import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("legal", "routes/legal.tsx"),
  route("cookies", "routes/cookies.tsx"),
] satisfies RouteConfig;
