import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteOrigin } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account/",
        "/cart",
        "/checkout",
        "/login",
        "/register",
        "/reset-password",
        "/order/"
      ]
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteOrigin()
  };
}
