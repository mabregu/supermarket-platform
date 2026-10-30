/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permitir SVG remotos (logos de supermercados en los datos mock).
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // Dominios remotos permitidos para la optimización de imágenes de next/image.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.supermarket.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
};

module.exports = nextConfig;
