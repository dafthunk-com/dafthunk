import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("terms", "routes/terms.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("cookies", "routes/cookies.tsx"),
  route("sitemap.xml", "routes/sitemap[.]xml.tsx"),
  route("nodes/:category", "routes/nodes/$category.tsx"),
  route("nodes/:category/:nodeId", "routes/nodes/$category.$nodeId.tsx"),
  route("workflows/:workflowId", "routes/workflows/$workflowId.tsx"),
] satisfies RouteConfig;
