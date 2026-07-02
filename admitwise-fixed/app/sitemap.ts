import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://admitwiseedu.com"

  const routes = [
    "",
    "/predictor",
    "/vacant-seat-tracker",
    "/about",
    "/contact",
    "/login",
    "/register",
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1.0 : 0.8,
  }))
}
