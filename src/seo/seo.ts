import type { Hono } from "hono";
import type { Env } from "../env";
import { SEED_CASES } from "../data/seed";

export function seo(app: Hono<{Bindings: Env}>) {
  app.get("/robots.txt", c => {
    const origin = new URL(c.req.url).origin;
    return c.text(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/admin/
Sitemap: ${origin}/sitemap.xml`);
  });

  app.get("/sitemap.xml", c => {
    const origin = new URL(c.req.url).origin;
    const urls = ["/", ...SEED_CASES.map(x => `/diagnosis/${x.slug}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${origin}${u}</loc></url>`).join("\n")}
</urlset>`;
    return c.body(xml, 200, {"Content-Type":"application/xml"});
  });
}