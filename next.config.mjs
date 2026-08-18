/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["archiver", "exceljs", "xlsx"],
  },
};

export default nextConfig;
