import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("legal", "routes/legal.tsx"),
  route("cookies", "routes/cookies.tsx"),
  route("sitemap.xml", "routes/sitemap[.]xml.tsx"),
  route("nodes/:category", "routes/nodes/$category.tsx"),
  route("nodes/:category/:nodeId", "routes/nodes/$category.$nodeId.tsx"),
  route("workflows/:workflowId", "routes/workflows/$workflowId.tsx"),
] satisfies RouteConfig;
