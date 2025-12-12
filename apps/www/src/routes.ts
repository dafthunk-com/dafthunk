import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("legal", "routes/legal.tsx"),
  route("cookies", "routes/cookies.tsx"),
  route("nodes", "routes/nodes/index.tsx"),
  route("nodes/:category", "routes/nodes/$category.tsx"),
  route("nodes/:category/:nodeId", "routes/nodes/$category.$nodeId.tsx"),
] satisfies RouteConfig;
