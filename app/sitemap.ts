import type { MetadataRoute } from "next";

// Only static routes are listed. NFT and profile pages are dynamic and
// depend on database rows, so they are not invented here.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bitbots.example.com";
  const paths = ["/", "/explore", "/market", "/leaderboard"];
  return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
