/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '44.200.84.42', port: '9000' },
      { protocol: 'https', hostname: '**' },
    ],
  },
}
export default nextConfig
