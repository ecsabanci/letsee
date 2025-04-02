/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
      'm.media-amazon.com',
      'unsplash.com',
      'upload.wikimedia.org',
      'res.cloudinary.com'
    ],
  },
}

module.exports = nextConfig
