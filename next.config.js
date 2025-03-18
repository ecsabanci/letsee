/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
      'm.media-amazon.com',
      'unsplash.com'
    ],
  },
}

module.exports = nextConfig
