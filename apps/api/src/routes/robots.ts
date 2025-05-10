import { Hono } from "hono";

const robots = new Hono();

robots.get("/", (c) => {
  const robotsTxt = `User-agent: *
Allow: /objects/
Disallow: /`;
  return c.text(robotsTxt);
});

export default robots;
