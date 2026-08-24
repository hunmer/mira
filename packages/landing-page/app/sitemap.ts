import type { MetadataRoute } from "next";
import { SITE_HOME_URL } from "@/config/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_HOME_URL}/`,
      lastModified: new Date().toISOString(),
    },
    {
      url: `${SITE_HOME_URL}/privacy`,
      lastModified: new Date().toISOString(),
    },
  ];
}
