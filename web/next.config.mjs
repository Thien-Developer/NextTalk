/** @type {import('next').NextConfig} */
const isElectron = process.env.NEXT_BUILD_TARGET === 'electron'

const nextConfig = {
  output: isElectron ? 'export' : undefined,
  trailingSlash: isElectron,
  images: {
    unoptimized: isElectron,
    remotePatterns: [
      { protocol: 'http', hostname: '44.200.84.42', port: '9000' },
      { protocol: 'https', hostname: '**' },
    ],
  },
}
export default nextConfig
