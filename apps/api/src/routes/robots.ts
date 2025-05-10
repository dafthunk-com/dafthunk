import { Hono } from "hono";

const robots = new Hono();

robots.get("/", (c) => {
  const robotsTxt = `User-agent: Twitterbot
Allow: /objects/
Disallow: /

User-agent: facebookexternalhit
Allow: /objects/
Disallow: /

User-agent: LinkedInBot
Allow: /objects/
Disallow: /

User-agent: Pinterestbot
Allow: /objects/
Disallow: /

User-agent: WhatsApp
Allow: /objects/
Disallow: /

User-agent: Discordbot
Allow: /objects/
Disallow: /

User-agent: Slackbot-LinkExpanding
Allow: /objects/
Disallow: /

User-agent: *
Disallow: /`;
  return c.text(robotsTxt);
});

export default robots;
