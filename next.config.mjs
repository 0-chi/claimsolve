/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ビルド時に生成するシード済み SQLite をサーバーレス関数バンドルに含める。
  experimental: {
    outputFileTracingIncludes: {
      "/**": ["./prisma/prod.db"],
    },
  },
};

export default nextConfig;
