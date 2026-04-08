import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://example.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // 禁止抓取静态资源（字体、JS、CSS 等）
          "/_next/static/",
          // 禁止抓取 API 路由
          "/api/",
          // 禁止抓取管理后台
          "/admin/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

